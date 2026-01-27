package executor

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"time"
)

type Command struct {
	ID      string `json:"id"`
	Command string `json:"command"`
	Timeout int    `json:"timeout"` // seconds
}

type CommandResult struct {
	ID       string `json:"id"`
	Output   string `json:"output"`
	ExitCode int    `json:"exit_code"`
	Error    string `json:"error,omitempty"`
}

type CommandExecutor struct{}

func NewCommandExecutor() *CommandExecutor {
	return &CommandExecutor{}
}

func (e *CommandExecutor) Execute(cmd *Command) *CommandResult {
	result := &CommandResult{ID: cmd.ID}

	timeout := time.Duration(cmd.Timeout) * time.Second
	if timeout == 0 {
		timeout = 60 * time.Second
	}

	c := exec.Command("sh", "-c", cmd.Command)
	var stdout, stderr bytes.Buffer
	c.Stdout = &stdout
	c.Stderr = &stderr

	done := make(chan error, 1)
	go func() {
		done <- c.Run()
	}()

	select {
	case err := <-done:
		if err != nil {
			if exitErr, ok := err.(*exec.ExitError); ok {
				result.ExitCode = exitErr.ExitCode()
			} else {
				result.ExitCode = -1
				result.Error = err.Error()
			}
		}
		result.Output = stdout.String()
		if stderr.Len() > 0 {
			result.Output += "\n[STDERR]\n" + stderr.String()
		}

	case <-time.After(timeout):
		if c.Process != nil {
			c.Process.Kill()
		}
		result.ExitCode = -1
		result.Error = "command timed out"
		result.Output = stdout.String()
	}

	return result
}

func (e *CommandExecutor) StartListener(serverAddr, token string) {
	log.Println("Command listener started")

	for {
		commands, err := e.fetchCommands(serverAddr, token)
		if err != nil {
			time.Sleep(5 * time.Second)
			continue
		}

		for _, cmd := range commands {
			log.Printf("Executing command: %s", cmd.ID)
			result := e.Execute(&cmd)
			if err := e.reportResult(serverAddr, token, result); err != nil {
				log.Printf("Failed to report result: %v", err)
			}
		}

		time.Sleep(5 * time.Second)
	}
}

func (e *CommandExecutor) fetchCommands(serverAddr, token string) ([]Command, error) {
	url := fmt.Sprintf("%s/api/v1/agent/commands", serverAddr)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Agent-Token", token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result struct {
		Code int       `json:"code"`
		Data []Command `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	return result.Data, nil
}

func (e *CommandExecutor) reportResult(serverAddr, token string, result *CommandResult) error {
	data, err := json.Marshal(result)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/api/v1/agent/result", serverAddr)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Token", token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return nil
}
