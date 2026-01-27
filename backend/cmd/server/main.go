package main

import (
	"fmt"
	"log"

	"devops/internal/config"
	authHandler "devops/internal/handler/auth"
	configHandler "devops/internal/handler/config"
	deployHandler "devops/internal/handler/deploy"
	k8sHandler "devops/internal/handler/k8s"
	monitorHandler "devops/internal/handler/monitor"
	userHandler "devops/internal/handler/user"
	"devops/internal/middleware"
	"devops/internal/pkg/jwt"
	"devops/internal/repository"
	"devops/internal/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load config
	cfg, err := config.Load("config.yaml")
	if err != nil {
		log.Printf("Failed to load config file, using defaults: %v", err)
		cfg = config.LoadDefault()
	}

	// Initialize database
	db, err := repository.InitDatabase(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize JWT manager
	jwtManager := jwt.NewJWTManager(cfg.JWT.Secret, cfg.JWT.ExpireHour)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	roleRepo := repository.NewRoleRepository(db)
	hostRepo := repository.NewHostRepository(db)
	hostGroupRepo := repository.NewHostGroupRepository(db)
	hostTagRepo := repository.NewHostTagRepository(db)
	appRepo := repository.NewAppRepository(db)
	envRepo := repository.NewEnvRepository(db)
	deployRepo := repository.NewDeploymentRepository(db)
	configRepo := repository.NewConfigRepository(db)
	configHistoryRepo := repository.NewConfigHistoryRepository(db)

	// Initialize default data
	if err := roleRepo.InitDefaultRoles(); err != nil {
		log.Printf("Failed to init default roles: %v", err)
	}
	if err := envRepo.InitDefaultEnvs(); err != nil {
		log.Printf("Failed to init default environments: %v", err)
	}

	// Initialize services
	authService := service.NewAuthService(userRepo, roleRepo, jwtManager)
	userService := service.NewUserService(userRepo, roleRepo)
	roleService := service.NewRoleService(roleRepo)
	hostService := service.NewHostService(hostRepo, hostGroupRepo, hostTagRepo)
	hostGroupService := service.NewHostGroupService(hostGroupRepo)
	hostTagService := service.NewHostTagService(hostTagRepo)
	appService := service.NewAppService(appRepo, envRepo, deployRepo, hostRepo)
	deployService := service.NewDeploymentService(deployRepo, appRepo)
	envService := service.NewEnvService(envRepo)
	configService := service.NewConfigService(configRepo, configHistoryRepo, cfg.JWT.Secret)
	clusterRepo := repository.NewClusterRepository(db)
	k8sService := service.NewK8sService(clusterRepo, cfg.JWT.Secret)

	// Initialize admin user
	if err := authService.InitAdminUser(); err != nil {
		log.Printf("Failed to init admin user: %v", err)
	}

	// Initialize handlers
	authH := authHandler.NewHandler(authService)
	userH := userHandler.NewHandler(userService, roleService)
	monitorH := monitorHandler.NewHandler(hostService, hostGroupService, hostTagService)
	deployH := deployHandler.NewHandler(appService, deployService, envService)
	configH := configHandler.NewHandler(configService)
	k8sH := k8sHandler.NewHandler(k8sService)

	// Setup Gin
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Middleware
	r.Use(middleware.CORS())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api/v1")
	{
		// Public routes
		auth := api.Group("/auth")
		authH.RegisterRoutes(auth)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.JWTAuth(jwtManager))
		protected.Use(middleware.AuditLog(db))

		// Auth routes (protected)
		authProtected := protected.Group("/auth")
		authH.RegisterAuthRoutes(authProtected)

		// User and Role routes
		userH.RegisterRoutes(protected)

		// Monitor routes
		monitorH.RegisterRoutes(protected)

		// Deploy routes
		deployH.RegisterRoutes(protected)

		// Config routes
		configH.RegisterRoutes(protected)

		// K8s cluster routes
		k8sH.RegisterRoutes(protected)
	}

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
