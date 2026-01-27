package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"

	"devops/internal/model"
	"devops/internal/repository"

	"github.com/google/uuid"
)

var (
	ErrConfigNotFound = errors.New("config item not found")
	ErrConfigKeyExists = errors.New("config key already exists")
)

type ConfigService struct {
	configRepo  *repository.ConfigRepository
	historyRepo *repository.ConfigHistoryRepository
	encryptKey  []byte
}

func NewConfigService(configRepo *repository.ConfigRepository, historyRepo *repository.ConfigHistoryRepository, encryptKey string) *ConfigService {
	key := []byte(encryptKey)
	if len(key) < 32 {
		// Pad to 32 bytes for AES-256
		padded := make([]byte, 32)
		copy(padded, key)
		key = padded
	}
	return &ConfigService{
		configRepo:  configRepo,
		historyRepo: historyRepo,
		encryptKey:  key[:32],
	}
}

type CreateConfigRequest struct {
	Key         string `json:"key" binding:"required"`
	Value       string `json:"value"`
	ValueType   string `json:"value_type"`
	EnvCode     string `json:"env_code" binding:"required"`
	AppCode     string `json:"app_code"`
	IsSecret    bool   `json:"is_secret"`
	Description string `json:"description"`
}

func (s *ConfigService) Create(req *CreateConfigRequest, createdBy uuid.UUID, username string) (*model.ConfigItem, error) {
	// Check if key exists
	if _, err := s.configRepo.GetByKey(req.Key, req.EnvCode, req.AppCode); err == nil {
		return nil, ErrConfigKeyExists
	}

	valueType := req.ValueType
	if valueType == "" {
		valueType = "string"
	}

	value := req.Value
	if req.IsSecret && value != "" {
		encrypted, err := s.encrypt(value)
		if err != nil {
			return nil, err
		}
		value = encrypted
	}

	config := &model.ConfigItem{
		Key:         req.Key,
		Value:       value,
		ValueType:   valueType,
		EnvCode:     req.EnvCode,
		AppCode:     req.AppCode,
		IsSecret:    req.IsSecret,
		Description: req.Description,
		Version:     1,
		CreatedBy:   createdBy,
		UpdatedBy:   createdBy,
	}

	if err := s.configRepo.Create(config); err != nil {
		return nil, err
	}

	// Create history
	history := &model.ConfigHistory{
		ConfigID:  config.ID,
		Key:       config.Key,
		OldValue:  "",
		NewValue:  req.Value, // Store original value in history
		EnvCode:   config.EnvCode,
		AppCode:   config.AppCode,
		Version:   1,
		Action:    "create",
		CreatedBy: createdBy,
		Username:  username,
	}
	s.historyRepo.Create(history)

	return config, nil
}

type UpdateConfigRequest struct {
	Value       string `json:"value"`
	Description string `json:"description"`
}

func (s *ConfigService) Update(id uuid.UUID, req *UpdateConfigRequest, updatedBy uuid.UUID, username string) (*model.ConfigItem, error) {
	config, err := s.configRepo.GetByID(id)
	if err != nil {
		return nil, ErrConfigNotFound
	}

	oldValue := config.Value
	if config.IsSecret {
		decrypted, err := s.decrypt(oldValue)
		if err == nil {
			oldValue = decrypted
		}
	}

	newValue := req.Value
	if config.IsSecret && newValue != "" {
		encrypted, err := s.encrypt(newValue)
		if err != nil {
			return nil, err
		}
		config.Value = encrypted
	} else {
		config.Value = newValue
	}

	if req.Description != "" {
		config.Description = req.Description
	}

	config.Version++
	config.UpdatedBy = updatedBy

	if err := s.configRepo.Update(config); err != nil {
		return nil, err
	}

	// Create history
	history := &model.ConfigHistory{
		ConfigID:  config.ID,
		Key:       config.Key,
		OldValue:  oldValue,
		NewValue:  req.Value,
		EnvCode:   config.EnvCode,
		AppCode:   config.AppCode,
		Version:   config.Version,
		Action:    "update",
		CreatedBy: updatedBy,
		Username:  username,
	}
	s.historyRepo.Create(history)

	return config, nil
}

func (s *ConfigService) Delete(id uuid.UUID, deletedBy uuid.UUID, username string) error {
	config, err := s.configRepo.GetByID(id)
	if err != nil {
		return ErrConfigNotFound
	}

	// Create history
	history := &model.ConfigHistory{
		ConfigID:  config.ID,
		Key:       config.Key,
		OldValue:  config.Value,
		NewValue:  "",
		EnvCode:   config.EnvCode,
		AppCode:   config.AppCode,
		Version:   config.Version,
		Action:    "delete",
		CreatedBy: deletedBy,
		Username:  username,
	}
	s.historyRepo.Create(history)

	return s.configRepo.Delete(id)
}

func (s *ConfigService) GetByID(id uuid.UUID, decrypt bool) (*model.ConfigItem, error) {
	config, err := s.configRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if decrypt && config.IsSecret {
		decrypted, err := s.decrypt(config.Value)
		if err == nil {
			config.Value = decrypted
		}
	}

	return config, nil
}

func (s *ConfigService) List(page, pageSize int, envCode, appCode, keyword string) ([]model.ConfigItem, int64, error) {
	return s.configRepo.List(page, pageSize, envCode, appCode, keyword)
}

func (s *ConfigService) GetByEnvAndApp(envCode, appCode string, decrypt bool) ([]model.ConfigItem, error) {
	configs, err := s.configRepo.GetByEnvAndApp(envCode, appCode)
	if err != nil {
		return nil, err
	}

	if decrypt {
		for i := range configs {
			if configs[i].IsSecret {
				decrypted, err := s.decrypt(configs[i].Value)
				if err == nil {
					configs[i].Value = decrypted
				}
			}
		}
	}

	return configs, nil
}

func (s *ConfigService) GetHistory(configID uuid.UUID, limit int) ([]model.ConfigHistory, error) {
	return s.historyRepo.ListByConfigID(configID, limit)
}

// Encryption helpers
func (s *ConfigService) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (s *ConfigService) decrypt(ciphertext string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(s.encryptKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertextBytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
