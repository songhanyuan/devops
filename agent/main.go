package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"devops-agent/collector"
	"devops-agent/executor"
)

var (
	serverAddr     = flag.String("server", "http://localhost:8080", "DevOps server address")
	reportInterval = flag.Int("interval", 15, "Metrics report interval (seconds)")
	agentToken     = flag.String("token", "", "Agent authentication token")
)

func main() {
	flag.Parse()

	if *agentToken == "" {
		log.Fatal("Agent token is required. Use -token flag.")
	}

	log.Printf("DevOps Agent starting...")
	log.Printf("Server: %s, Interval: %ds", *serverAddr, *reportInterval)

	// Initialize collector
	mc := collector.NewMetricsCollector()

	// Initialize executor
	exec := executor.NewCommandExecutor()

	// Start metrics reporting
	ticker := time.NewTicker(time.Duration(*reportInterval) * time.Second)
	defer ticker.Stop()

	// Start command listener
	go exec.StartListener(*serverAddr, *agentToken)

	// Handle graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	log.Println("Agent is running. Press Ctrl+C to stop.")

	for {
		select {
		case <-ticker.C:
			metrics, err := mc.Collect()
			if err != nil {
				log.Printf("Failed to collect metrics: %v", err)
				continue
			}

			if err := mc.Report(*serverAddr, *agentToken, metrics); err != nil {
				log.Printf("Failed to report metrics: %v", err)
			}

		case <-quit:
			log.Println("Agent shutting down...")
			return
		}
	}

	_ = exec // keep reference
}
