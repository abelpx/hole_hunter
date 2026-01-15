package repo

import (
	"context"
	"testing"

	"github.com/holehunter/holehunter/internal/models"
)

// TestTargetRepository_Create 测试创建目标
func TestTargetRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewTargetRepository(db)
	ctx := context.Background()

	target := &models.Target{
		Name:        "Test Target",
		URL:         "https://example.com",
		Description: "Test description",
		Tags:        []string{"test", "demo"},
	}

	err := repo.Create(ctx, target)
	if err != nil {
		t.Fatalf("Create() failed: %v", err)
	}

	if target.ID == 0 {
		t.Error("Create() did not set ID")
	}
}

// TestTargetRepository_GetByID 测试根据 ID 获取目标
func TestTargetRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewTargetRepository(db)
	ctx := context.Background()

	// 先创建一个目标
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := repo.Create(ctx, target); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 测试获取
	fetched, err := repo.GetByID(ctx, target.ID)
	if err != nil {
		t.Fatalf("GetByID() failed: %v", err)
	}

	if fetched.Name != target.Name {
		t.Errorf("GetByID() Name = %s, want %s", fetched.Name, target.Name)
	}
	if fetched.URL != target.URL {
		t.Errorf("GetByID() URL = %s, want %s", fetched.URL, target.URL)
	}
}

// TestTargetRepository_GetByID_NotFound 测试获取不存在的目标
func TestTargetRepository_GetByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewTargetRepository(db)
	ctx := context.Background()

	_, err := repo.GetByID(ctx, 999)
	if err == nil {
		t.Error("GetByID() should return error for non-existent ID")
	}
}

// TestTargetRepository_GetAll 测试获取所有目标
func TestTargetRepository_GetAll(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewTargetRepository(db)
	ctx := context.Background()

	// 创建多个目标
	for i := 0; i < 3; i++ {
		target := &models.Target{
			Name: "Test Target",
			URL:  "https://example.com",
		}
		if err := repo.Create(ctx, target); err != nil {
			t.Fatalf("setup Create() failed: %v", err)
		}
	}

	// 获取所有目标
	targets, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() failed: %v", err)
	}

	if len(targets) != 3 {
		t.Errorf("GetAll() returned %d targets, want 3", len(targets))
	}
}

// TestTargetRepository_Update 测试更新目标
func TestTargetRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewTargetRepository(db)
	ctx := context.Background()

	// 创建目标
	target := &models.Target{
		Name: "Original Name",
		URL:  "https://example.com",
	}
	if err := repo.Create(ctx, target); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 更新
	target.Name = "Updated Name"
	target.Description = "Updated description"
	target.Tags = []string{"updated"}

	err := repo.Update(ctx, target)
	if err != nil {
		t.Fatalf("Update() failed: %v", err)
	}

	// 验证更新
	fetched, _ := repo.GetByID(ctx, target.ID)
	if fetched.Name != "Updated Name" {
		t.Errorf("Update() Name = %s, want Updated Name", fetched.Name)
	}
	if fetched.Description != "Updated description" {
		t.Errorf("Update() Description = %s, want Updated description", fetched.Description)
	}
}

// TestTargetRepository_Delete 测试删除目标
func TestTargetRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewTargetRepository(db)
	ctx := context.Background()

	// 创建目标
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := repo.Create(ctx, target); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 删除
	err := repo.Delete(ctx, target.ID)
	if err != nil {
		t.Fatalf("Delete() failed: %v", err)
	}

	// 验证删除
	_, err = repo.GetByID(ctx, target.ID)
	if err == nil {
		t.Error("Delete() target should not exist after deletion")
	}
}

// TestTargetRepository_ExistsByURL 测试检查 URL 是否存在
func TestTargetRepository_ExistsByURL(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewTargetRepository(db)
	ctx := context.Background()

	// 创建目标
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := repo.Create(ctx, target); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	tests := []struct {
		name      string
		url       string
		excludeID int
		want      bool
	}{
		{
			name: "existing url",
			url:  "https://example.com",
			want: true,
		},
		{
			name: "non-existing url",
			url:  "https://nonexistent.com",
			want: false,
		},
		{
			name:      "existing url but excluded",
			url:       "https://example.com",
			excludeID: target.ID,
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			exists, err := repo.ExistsByURL(ctx, tt.url, tt.excludeID)
			if err != nil {
				t.Fatalf("ExistsByURL() failed: %v", err)
			}
			if exists != tt.want {
				t.Errorf("ExistsByURL() = %v, want %v", exists, tt.want)
			}
		})
	}
}

// TestBaseRepository_Exists 测试基础仓储的 Exists 方法
func TestBaseRepository_Exists(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	baseRepo := NewBaseRepository(db)
	targetRepo := NewTargetRepository(db)
	ctx := context.Background()

	// 创建一个目标
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 测试 Exists
	exists, err := baseRepo.Exists(ctx, "targets", "id = ?", target.ID)
	if err != nil {
		t.Fatalf("Exists() failed: %v", err)
	}
	if !exists {
		t.Error("Exists() should return true for existing record")
	}

	// 测试不存在的记录
	exists, err = baseRepo.Exists(ctx, "targets", "id = ?", 999)
	if err != nil {
		t.Fatalf("Exists() failed: %v", err)
	}
	if exists {
		t.Error("Exists() should return false for non-existent record")
	}
}

// TestBaseRepository_DeleteByID 测试基础仓储的 DeleteByID 方法
func TestBaseRepository_DeleteByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	baseRepo := NewBaseRepository(db)
	targetRepo := NewTargetRepository(db)
	ctx := context.Background()

	// 创建一个目标
	target := &models.Target{
		Name: "Test Target",
		URL:  "https://example.com",
	}
	if err := targetRepo.Create(ctx, target); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 使用 BaseRepository 删除
	err := baseRepo.DeleteByID(ctx, "targets", target.ID)
	if err != nil {
		t.Fatalf("DeleteByID() failed: %v", err)
	}

	// 验证删除
	_, err = targetRepo.GetByID(ctx, target.ID)
	if err == nil {
		t.Error("target should not exist after deletion")
	}
}
