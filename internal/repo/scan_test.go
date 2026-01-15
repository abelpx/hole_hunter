package repo

import (
	"context"
	"testing"

	"github.com/holehunter/holehunter/internal/models"
)

// TestScanRepository_Create 测试创建扫描任务
func TestScanRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	task := &models.ScanTask{
		Name:          strPtr("Test Scan"),
		TargetID:      1,
		Status:        "pending",
		Strategy:      "fast",
		TemplatesUsed: []string{"cve-2021-44228"},
	}

	err := repo.Create(ctx, task)
	if err != nil {
		t.Fatalf("Create() failed: %v", err)
	}

	if task.ID == 0 {
		t.Error("Create() did not set ID")
	}
}

// TestScanRepository_GetByID 测试根据 ID 获取扫描任务
func TestScanRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 先创建一个任务
	task := &models.ScanTask{
		Name:     strPtr("Test Scan"),
		TargetID: 1,
		Status:   "pending",
		Strategy: "fast",
	}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 测试获取
	fetched, err := repo.GetByID(ctx, task.ID)
	if err != nil {
		t.Fatalf("GetByID() failed: %v", err)
	}

	if fetched.Status != task.Status {
		t.Errorf("GetByID() Status = %s, want %s", fetched.Status, task.Status)
	}
	if fetched.TargetID != task.TargetID {
		t.Errorf("GetByID() TargetID = %d, want %d", fetched.TargetID, task.TargetID)
	}
}

// TestScanRepository_GetByID_NotFound 测试获取不存在的扫描任务
func TestScanRepository_GetByID_NotFound(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	_, err := repo.GetByID(ctx, 999)
	if err == nil {
		t.Error("GetByID() should return error for non-existent ID")
	}
}

// TestScanRepository_GetAll 测试获取所有扫描任务
func TestScanRepository_GetAll(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建多个任务
	for i := 0; i < 3; i++ {
		task := &models.ScanTask{
			Name:     strPtr("Test Scan"),
			TargetID: 1,
			Status:   "pending",
			Strategy: "fast",
		}
		if err := repo.Create(ctx, task); err != nil {
			t.Fatalf("setup Create() failed: %v", err)
		}
	}

	// 获取所有任务
	tasks, err := repo.GetAll(ctx)
	if err != nil {
		t.Fatalf("GetAll() failed: %v", err)
	}

	if len(tasks) != 3 {
		t.Errorf("GetAll() returned %d tasks, want 3", len(tasks))
	}
}

// TestScanRepository_UpdateStatus 测试更新扫描任务状态
func TestScanRepository_UpdateStatus(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建任务
	task := &models.ScanTask{
		Name:     strPtr("Test Scan"),
		TargetID: 1,
		Status:   "pending",
		Strategy: "fast",
	}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 更新状态为 running
	err := repo.UpdateStatus(ctx, task.ID, "running")
	if err != nil {
		t.Fatalf("UpdateStatus() failed: %v", err)
	}

	// 验证更新
	fetched, _ := repo.GetByID(ctx, task.ID)
	if fetched.Status != "running" {
		t.Errorf("UpdateStatus() Status = %s, want running", fetched.Status)
	}
	if fetched.StartedAt == nil {
		t.Error("UpdateStatus() should set StartedAt when status is running")
	}
}

// TestScanRepository_UpdateStatus_Completed 测试更新为完成状态
func TestScanRepository_UpdateStatus_Completed(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建任务
	task := &models.ScanTask{
		Name:     strPtr("Test Scan"),
		TargetID: 1,
		Status:   "running",
		Strategy: "fast",
	}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 更新状态为 completed
	err := repo.UpdateStatus(ctx, task.ID, "completed")
	if err != nil {
		t.Fatalf("UpdateStatus() failed: %v", err)
	}

	// 验证更新
	fetched, _ := repo.GetByID(ctx, task.ID)
	if fetched.Status != "completed" {
		t.Errorf("UpdateStatus() Status = %s, want completed", fetched.Status)
	}
	if fetched.CompletedAt == nil {
		t.Error("UpdateStatus() should set CompletedAt when status is completed")
	}
}

// TestScanRepository_UpdateProgress 测试更新扫描进度
func TestScanRepository_UpdateProgress(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建任务
	task := &models.ScanTask{
		Name:     strPtr("Test Scan"),
		TargetID: 1,
		Status:   "running",
		Strategy: "fast",
	}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 更新进度
	progress := models.ScanProgress{
		Progress:        50,
		TotalTemplates:  100,
		Executed:        50,
		CurrentTemplate: "cve-2021-44228",
	}

	err := repo.UpdateProgress(ctx, task.ID, progress)
	if err != nil {
		t.Fatalf("UpdateProgress() failed: %v", err)
	}

	// 验证更新
	fetched, _ := repo.GetByID(ctx, task.ID)
	if fetched.Progress != 50 {
		t.Errorf("UpdateProgress() Progress = %d, want 50", fetched.Progress)
	}
}

// TestScanRepository_Delete 测试删除扫描任务
func TestScanRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建任务
	task := &models.ScanTask{
		Name:     strPtr("Test Scan"),
		TargetID: 1,
		Status:   "pending",
		Strategy: "fast",
	}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 删除
	err := repo.Delete(ctx, task.ID)
	if err != nil {
		t.Fatalf("Delete() failed: %v", err)
	}

	// 验证删除
	_, err = repo.GetByID(ctx, task.ID)
	if err == nil {
		t.Error("Delete() task should not exist after deletion")
	}
}

// TestScanRepository_CountByStatus 测试统计各状态的扫描任务数量
func TestScanRepository_CountByStatus(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建不同状态的任务
	statuses := []string{"pending", "running", "completed", "failed"}
	for _, status := range statuses {
		task := &models.ScanTask{
			Name:     strPtr("Test Scan"),
			TargetID: 1,
			Status:   status,
			Strategy: "fast",
		}
		if err := repo.Create(ctx, task); err != nil {
			t.Fatalf("setup Create() failed: %v", err)
		}
	}

	// 统计
	counts, err := repo.CountByStatus(ctx)
	if err != nil {
		t.Fatalf("CountByStatus() failed: %v", err)
	}

	for _, status := range statuses {
		if counts[status] != 1 {
			t.Errorf("CountByStatus() %s count = %d, want 1", status, counts[status])
		}
	}
}

// TestScanRepository_GetByTargetID 测试根据目标 ID 获取扫描任务
func TestScanRepository_GetByTargetID(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	targetID := 42
	// 为同一目标创建多个任务
	for i := 0; i < 3; i++ {
		task := &models.ScanTask{
			Name:     strPtr("Test Scan"),
			TargetID: targetID,
			Status:   "pending",
			Strategy: "fast",
		}
		if err := repo.Create(ctx, task); err != nil {
			t.Fatalf("setup Create() failed: %v", err)
		}
	}

	// 获取该目标的所有任务
	tasks, err := repo.GetByTargetID(ctx, targetID)
	if err != nil {
		t.Fatalf("GetByTargetID() failed: %v", err)
	}

	if len(tasks) != 3 {
		t.Errorf("GetByTargetID() returned %d tasks, want 3", len(tasks))
	}

	for _, task := range tasks {
		if task.TargetID != targetID {
			t.Errorf("GetByTargetID() returned task with TargetID = %d, want %d", task.TargetID, targetID)
		}
	}
}

// TestScanRepository_GetAllPaged 测试分页获取扫描任务
func TestScanRepository_GetAllPaged(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建 5 个任务
	for i := 0; i < 5; i++ {
		task := &models.ScanTask{
			Name:     strPtr("Test Scan"),
			TargetID: 1,
			Status:   "pending",
			Strategy: "fast",
		}
		if err := repo.Create(ctx, task); err != nil {
			t.Fatalf("setup Create() failed: %v", err)
		}
	}

	// 测试分页
	tasks, err := repo.GetAllPaged(ctx, 0, 2)
	if err != nil {
		t.Fatalf("GetAllPaged() failed: %v", err)
	}

	if len(tasks) != 2 {
		t.Errorf("GetAllPaged() returned %d tasks, want 2", len(tasks))
	}

	// 测试 offset
	tasks2, err := repo.GetAllPaged(ctx, 2, 2)
	if err != nil {
		t.Fatalf("GetAllPaged() failed: %v", err)
	}

	if len(tasks2) != 2 {
		t.Errorf("GetAllPaged() returned %d tasks, want 2", len(tasks2))
	}

	// 确保是不同的任务
	if tasks[0].ID == tasks2[0].ID {
		t.Error("GetAllPaged() should return different tasks with different offset")
	}
}

// TestScanRepository_Update 测试更新扫描任务
func TestScanRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	defer db.Close()

	repo := NewScanRepository(db)
	ctx := context.Background()

	// 创建任务
	task := &models.ScanTask{
		Name:     strPtr("Test Scan"),
		TargetID: 1,
		Status:   "pending",
		Strategy: "fast",
	}
	if err := repo.Create(ctx, task); err != nil {
		t.Fatalf("setup Create() failed: %v", err)
	}

	// 更新
	task.Status = "running"
	task.Progress = 50
	errMsg := "test error"
	task.Error = &errMsg

	err := repo.Update(ctx, task)
	if err != nil {
		t.Fatalf("Update() failed: %v", err)
	}

	// 验证更新
	fetched, _ := repo.GetByID(ctx, task.ID)
	if fetched.Status != "running" {
		t.Errorf("Update() Status = %s, want running", fetched.Status)
	}
	if fetched.Progress != 50 {
		t.Errorf("Update() Progress = %d, want 50", fetched.Progress)
	}
	if fetched.Error == nil || *fetched.Error != errMsg {
		t.Errorf("Update() Error = %v, want %s", fetched.Error, errMsg)
	}
}

// 辅助函数
func strPtr(s string) *string {
	return &s
}
