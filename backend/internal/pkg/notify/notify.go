package notify

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/smtp"
	"time"
)

type Notifier interface {
	Send(title, content string) error
}

// Email notifier
type EmailNotifier struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	To       []string
	UseTLS   bool
}

func NewEmailNotifier(host string, port int, username, password, from string, to []string, useTLS bool) *EmailNotifier {
	return &EmailNotifier{
		Host:     host,
		Port:     port,
		Username: username,
		Password: password,
		From:     from,
		To:       to,
		UseTLS:   useTLS,
	}
}

func (n *EmailNotifier) Send(title, content string) error {
	addr := fmt.Sprintf("%s:%d", n.Host, n.Port)

	msg := fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n"+
		"\r\n"+
		"%s\r\n", n.From, n.To[0], title, content)

	auth := smtp.PlainAuth("", n.Username, n.Password, n.Host)

	if n.UseTLS {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: true,
			ServerName:         n.Host,
		}

		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return err
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, n.Host)
		if err != nil {
			return err
		}
		defer client.Close()

		if err = client.Auth(auth); err != nil {
			return err
		}

		if err = client.Mail(n.From); err != nil {
			return err
		}

		for _, to := range n.To {
			if err = client.Rcpt(to); err != nil {
				return err
			}
		}

		w, err := client.Data()
		if err != nil {
			return err
		}

		_, err = w.Write([]byte(msg))
		if err != nil {
			return err
		}

		return w.Close()
	}

	return smtp.SendMail(addr, auth, n.From, n.To, []byte(msg))
}

// DingTalk notifier
type DingTalkNotifier struct {
	Webhook string
}

func NewDingTalkNotifier(webhook string) *DingTalkNotifier {
	return &DingTalkNotifier{Webhook: webhook}
}

func (n *DingTalkNotifier) Send(title, content string) error {
	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"title": title,
			"text":  fmt.Sprintf("## %s\n\n%s", title, content),
		},
	}

	return sendWebhook(n.Webhook, payload)
}

// WeChat Work notifier
type WeChatWorkNotifier struct {
	Webhook string
}

func NewWeChatWorkNotifier(webhook string) *WeChatWorkNotifier {
	return &WeChatWorkNotifier{Webhook: webhook}
}

func (n *WeChatWorkNotifier) Send(title, content string) error {
	payload := map[string]interface{}{
		"msgtype": "markdown",
		"markdown": map[string]string{
			"content": fmt.Sprintf("## %s\n\n%s", title, content),
		},
	}

	return sendWebhook(n.Webhook, payload)
}

// Feishu notifier
type FeishuNotifier struct {
	Webhook string
}

func NewFeishuNotifier(webhook string) *FeishuNotifier {
	return &FeishuNotifier{Webhook: webhook}
}

func (n *FeishuNotifier) Send(title, content string) error {
	payload := map[string]interface{}{
		"msg_type": "interactive",
		"card": map[string]interface{}{
			"header": map[string]interface{}{
				"title": map[string]string{
					"tag":     "plain_text",
					"content": title,
				},
			},
			"elements": []map[string]interface{}{
				{
					"tag": "markdown",
					"content": content,
				},
			},
		},
	}

	return sendWebhook(n.Webhook, payload)
}

func sendWebhook(url string, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}

	return nil
}

// Multi notifier
type MultiNotifier struct {
	notifiers []Notifier
}

func NewMultiNotifier(notifiers ...Notifier) *MultiNotifier {
	return &MultiNotifier{notifiers: notifiers}
}

func (n *MultiNotifier) Send(title, content string) error {
	var lastErr error
	for _, notifier := range n.notifiers {
		if err := notifier.Send(title, content); err != nil {
			lastErr = err
		}
	}
	return lastErr
}
