package collector

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type Metrics struct {
	Hostname    string       `json:"hostname"`
	OS          string       `json:"os"`
	Platform    string       `json:"platform"`
	Uptime      uint64       `json:"uptime"`
	CPU         CPUMetrics   `json:"cpu"`
	Memory      MemMetrics   `json:"memory"`
	Disk        DiskMetrics  `json:"disk"`
	Network     NetMetrics   `json:"network"`
	Load        LoadMetrics  `json:"load"`
	CollectedAt time.Time    `json:"collected_at"`
}

type CPUMetrics struct {
	UsagePercent float64 `json:"usage_percent"`
	Cores        int     `json:"cores"`
}

type MemMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"used_percent"`
}

type DiskMetrics struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
}

type NetMetrics struct {
	BytesSent   uint64 `json:"bytes_sent"`
	BytesRecv   uint64 `json:"bytes_recv"`
	PacketsSent uint64 `json:"packets_sent"`
	PacketsRecv uint64 `json:"packets_recv"`
}

type LoadMetrics struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}

type MetricsCollector struct{}

func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{}
}

func (c *MetricsCollector) Collect() (*Metrics, error) {
	metrics := &Metrics{
		CollectedAt: time.Now(),
	}

	// Hostname
	hostname, err := os.Hostname()
	if err == nil {
		metrics.Hostname = hostname
	}

	// Host info
	hostInfo, err := host.Info()
	if err == nil {
		metrics.OS = hostInfo.OS
		metrics.Platform = hostInfo.Platform
		metrics.Uptime = hostInfo.Uptime
	}

	// CPU
	cpuPercent, err := cpu.Percent(time.Second, false)
	if err == nil && len(cpuPercent) > 0 {
		metrics.CPU.UsagePercent = cpuPercent[0]
	}
	metrics.CPU.Cores = runtime.NumCPU()

	// Memory
	memInfo, err := mem.VirtualMemory()
	if err == nil {
		metrics.Memory = MemMetrics{
			Total:       memInfo.Total,
			Used:        memInfo.Used,
			Available:   memInfo.Available,
			UsedPercent: memInfo.UsedPercent,
		}
	}

	// Disk
	diskInfo, err := disk.Usage("/")
	if err == nil {
		metrics.Disk = DiskMetrics{
			Total:       diskInfo.Total,
			Used:        diskInfo.Used,
			Free:        diskInfo.Free,
			UsedPercent: diskInfo.UsedPercent,
		}
	}

	// Network
	netInfo, err := net.IOCounters(false)
	if err == nil && len(netInfo) > 0 {
		metrics.Network = NetMetrics{
			BytesSent:   netInfo[0].BytesSent,
			BytesRecv:   netInfo[0].BytesRecv,
			PacketsSent: netInfo[0].PacketsSent,
			PacketsRecv: netInfo[0].PacketsRecv,
		}
	}

	// Load average
	loadInfo, err := load.Avg()
	if err == nil {
		metrics.Load = LoadMetrics{
			Load1:  loadInfo.Load1,
			Load5:  loadInfo.Load5,
			Load15: loadInfo.Load15,
		}
	}

	return metrics, nil
}

func (c *MetricsCollector) Report(serverAddr, token string, metrics *Metrics) error {
	data, err := json.Marshal(metrics)
	if err != nil {
		return fmt.Errorf("marshal metrics: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/agent/report", serverAddr)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Agent-Token", token)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send report: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	return nil
}
