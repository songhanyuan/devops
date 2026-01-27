package ssh

import (
	"bytes"
	"fmt"
	"io"
	"time"

	"golang.org/x/crypto/ssh"
)

type Executor struct {
	client *ssh.Client
	config *ssh.ClientConfig
	addr   string
}

type Config struct {
	Host       string
	Port       int
	Username   string
	Password   string
	PrivateKey string
	Timeout    time.Duration
}

func NewExecutor(cfg *Config) (*Executor, error) {
	var authMethods []ssh.AuthMethod

	if cfg.PrivateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(cfg.PrivateKey))
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %w", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	if cfg.Password != "" {
		authMethods = append(authMethods, ssh.Password(cfg.Password))
	}

	if len(authMethods) == 0 {
		return nil, fmt.Errorf("no authentication method provided")
	}

	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 30 * time.Second
	}

	sshConfig := &ssh.ClientConfig{
		User:            cfg.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         timeout,
	}

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)

	return &Executor{
		config: sshConfig,
		addr:   addr,
	}, nil
}

func (e *Executor) Connect() error {
	client, err := ssh.Dial("tcp", e.addr, e.config)
	if err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}
	e.client = client
	return nil
}

func (e *Executor) Close() error {
	if e.client != nil {
		return e.client.Close()
	}
	return nil
}

type ExecResult struct {
	Stdout   string
	Stderr   string
	ExitCode int
}

func (e *Executor) Execute(command string) (*ExecResult, error) {
	if e.client == nil {
		if err := e.Connect(); err != nil {
			return nil, err
		}
	}

	session, err := e.client.NewSession()
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()

	var stdout, stderr bytes.Buffer
	session.Stdout = &stdout
	session.Stderr = &stderr

	err = session.Run(command)

	result := &ExecResult{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}

	if err != nil {
		if exitErr, ok := err.(*ssh.ExitError); ok {
			result.ExitCode = exitErr.ExitStatus()
		} else {
			return result, err
		}
	}

	return result, nil
}

func (e *Executor) ExecuteWithOutput(command string, output io.Writer) error {
	if e.client == nil {
		if err := e.Connect(); err != nil {
			return err
		}
	}

	session, err := e.client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()

	session.Stdout = output
	session.Stderr = output

	return session.Run(command)
}

func (e *Executor) Upload(localContent []byte, remotePath string, mode string) error {
	if e.client == nil {
		if err := e.Connect(); err != nil {
			return err
		}
	}

	session, err := e.client.NewSession()
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}
	defer session.Close()

	go func() {
		w, _ := session.StdinPipe()
		defer w.Close()
		fmt.Fprintf(w, "C%s %d %s\n", mode, len(localContent), remotePath)
		w.Write(localContent)
		fmt.Fprint(w, "\x00")
	}()

	return session.Run("scp -t " + remotePath)
}

// ExecuteScript executes a shell script on remote host
func (e *Executor) ExecuteScript(script string) (*ExecResult, error) {
	// Create a temporary script and execute
	command := fmt.Sprintf("bash -c '%s'", script)
	return e.Execute(command)
}
