# DevOps 平台

一个面向研发与运维团队的轻量级 DevOps 管理平台，覆盖应用发布、配置管理、基础监控与 Kubernetes 资源管理。界面现代化、操作流清晰，并提供 YAML 直编与历史回滚能力。

## 主要功能

- **应用发布**：应用与环境管理、发布流水线与版本管理
- **配置中心**：配置项管理与变更历史
- **主机监控**：主机资源与告警规则
- **Kubernetes 管理**：集群/命名空间/Workload/Service/Ingress/ConfigMap/Secret/Pod
- **YAML 管理增强**：格式化、校验（dry-run）、差异预览、历史版本与一键回滚

## 技术栈

- **后端**：Go + Gin + Gorm
- **前端**：React + Vite + Ant Design
- **数据**：PostgreSQL + Redis
- **监控**：Prometheus + Alertmanager

## 快速开始（Docker）

1. 进入部署目录

```bash
cd deploy
```

2. （可选）配置环境变量

```bash
cp .env.example .env
```

3. 启动服务

```bash
docker compose up -d --build
```

4. 访问系统

- 前端：`http://localhost`
- 后端：`http://localhost:8080`

5. 默认账号

- 用户名：`admin`
- 密码：`admin123`

> 建议首次登录后修改密码与 `JWT_SECRET`。

## 端口说明

- Web 前端：`80`
- API 后端：`8080`
- PostgreSQL：`5432`
- Redis：`6379`
- Prometheus：`9090`
- Alertmanager：`9093`

## 环境变量（摘选）

以下变量可在 `deploy/.env` 中配置：

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
- `POSTGRES_PORT`
- `REDIS_PASSWORD` / `REDIS_PORT` / `REDIS_DB`
- `JWT_SECRET`
- `SERVER_MODE`

## 目录结构

```
.
├─ backend/          # 后端服务
├─ frontend/         # 前端应用
├─ deploy/           # Docker Compose 与监控配置
└─ .github/          # CI 配置
```

## K8s YAML 管理说明

- 支持 YAML 创建 / 编辑 / 校验 / 格式化
- 支持历史版本查看与回滚（默认保留 20 条）
- 回滚操作会直接 apply 到集群

## CI

仓库内置 GitHub Actions CI（见 `.github/workflows/ci.yml`），默认包含依赖安装、构建与基础检查。

---

如需定制部署、权限模型或接入企业环境（SSO、LDAP、告警通知等），欢迎在此基础上扩展。
