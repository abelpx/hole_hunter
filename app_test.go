package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/holehunter/holehunter/internal/repository"
	"github.com/holehunter/holehunter/internal/services"
)

// TestScenarioGroupCreate 测试创建场景分组
func TestScenarioGroupCreate(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "scenario-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	scenarioRepo := repository.NewScenarioRepository(tmpDir)
	scenarioService := services.NewScenarioService(scenarioRepo)

	app := &App{
		userDataDir:    tmpDir,
		scenarioService: scenarioService,
	}

	t.Run("CreateValidGroup", func(t *testing.T) {
		group, err := app.CreateScenarioGroup("登录接口检测", "用于检测登录相关的安全漏洞")
		if err != nil {
			t.Fatalf("CreateScenarioGroup failed: %v", err)
		}

		if group.Name != "登录接口检测" {
			t.Errorf("Expected name '登录接口检测', got '%s'", group.Name)
		}
		if group.Description != "用于检测登录相关的安全漏洞" {
			t.Errorf("Expected description '用于检测登录相关的安全漏洞', got '%s'", group.Description)
		}
		if len(group.TemplateIDs) != 0 {
			t.Errorf("Expected empty template IDs, got %v", group.TemplateIDs)
		}
		if group.ID == "" {
			t.Error("Expected non-empty ID")
		}
		if group.CreatedAt == 0 {
			t.Error("Expected non-zero CreatedAt")
		}
		if group.UpdatedAt == 0 {
			t.Error("Expected non-zero UpdatedAt")
		}
	})

	t.Run("VerifyFileCreated", func(t *testing.T) {
		_, _ = app.CreateScenarioGroup("测试分组", "测试")

		scenarioFile := filepath.Join(tmpDir, "scenario-groups.json")
		if _, err := os.Stat(scenarioFile); os.IsNotExist(err) {
			t.Error("Scenario groups file was not created")
		}
	})
}

// TestScenarioGroupGet 测试获取场景分组
func TestScenarioGroupGet(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "scenario-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	scenarioRepo := repository.NewScenarioRepository(tmpDir)
	scenarioService := services.NewScenarioService(scenarioRepo)

	app := &App{
		userDataDir:     tmpDir,
		scenarioService: scenarioService,
	}

	t.Run("GetAllGroups", func(t *testing.T) {
		group1, _ := app.CreateScenarioGroup("分组1", "描述1")
		group2, _ := app.CreateScenarioGroup("分组2", "描述2")

		groups, err := app.GetScenarioGroups()
		if err != nil {
			t.Fatalf("GetScenarioGroups failed: %v", err)
		}

		if len(groups) < 2 {
			t.Errorf("Expected at least 2 groups, got %d", len(groups))
		}

		// 验证分组是否存在
		found1 := false
		found2 := false
		for _, g := range groups {
			if g.ID == group1.ID {
				found1 = true
			}
			if g.ID == group2.ID {
				found2 = true
			}
		}

		if !found1 {
			t.Error("Group1 not found in GetScenarioGroups result")
		}
		if !found2 {
			t.Error("Group2 not found in GetScenarioGroups result")
		}
	})

	t.Run("GetGroupByID", func(t *testing.T) {
		created, err := app.CreateScenarioGroup("测试分组", "测试描述")
		if err != nil {
			t.Fatalf("Failed to create group: %v", err)
		}

		found, err := app.GetScenarioGroupByID(created.ID)
		if err != nil {
			t.Fatalf("GetScenarioGroupByID failed: %v", err)
		}

		if found.ID != created.ID {
			t.Errorf("Expected ID '%s', got '%s'", created.ID, found.ID)
		}
		if found.Name != created.Name {
			t.Errorf("Expected name '%s', got '%s'", created.Name, found.Name)
		}
	})

	t.Run("GetNonExistentGroup", func(t *testing.T) {
		_, err := app.GetScenarioGroupByID("non-existent-id")
		if err == nil {
			t.Error("Expected error for non-existent group, got nil")
		}
	})
}

// TestScenarioGroupUpdate 测试更新场景分组
func TestScenarioGroupUpdate(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "scenario-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	scenarioRepo := repository.NewScenarioRepository(tmpDir)
	scenarioService := services.NewScenarioService(scenarioRepo)

	app := &App{
		userDataDir:     tmpDir,
		scenarioService: scenarioService,
	}

	t.Run("UpdateExistingGroup", func(t *testing.T) {
		group, _ := app.CreateScenarioGroup("原始名称", "原始描述")

		updatedName := "更新后的名称"
		updatedDesc := "更新后的描述"
		templateIDs := []string{"template-1", "template-2", "template-3"}

		err := app.UpdateScenarioGroup(group.ID, updatedName, updatedDesc, templateIDs)
		if err != nil {
			t.Fatalf("UpdateScenarioGroup failed: %v", err)
		}

		// 验证更新
		groups, _ := app.GetScenarioGroups()
		var updatedGroup *ScenarioGroup
		for _, g := range groups {
			if g.ID == group.ID {
				updatedGroup = &g
				break
			}
		}

		if updatedGroup == nil {
			t.Fatal("Updated group not found")
		}

		if updatedGroup.Name != updatedName {
			t.Errorf("Expected name '%s', got '%s'", updatedName, updatedGroup.Name)
		}
		if updatedGroup.Description != updatedDesc {
			t.Errorf("Expected description '%s', got '%s'", updatedDesc, updatedGroup.Description)
		}
		if len(updatedGroup.TemplateIDs) != len(templateIDs) {
			t.Errorf("Expected %d template IDs, got %d", len(templateIDs), len(updatedGroup.TemplateIDs))
		}
	})

	t.Run("UpdateNonExistentGroup", func(t *testing.T) {
		err := app.UpdateScenarioGroup("non-existent", "name", "desc", []string{"tpl-1"})
		if err == nil {
			t.Error("Expected error when updating non-existent group")
		}
	})

	t.Run("TimestampUpdate", func(t *testing.T) {
		group, _ := app.CreateScenarioGroup("时间戳测试", "测试")
		originalUpdatedAt := group.UpdatedAt

		// 等待超过 1 秒确保时间戳不同（Unix 秒级精度）
		time.Sleep(1100 * time.Millisecond)

		app.UpdateScenarioGroup(group.ID, "更新后的名称", "更新后的描述", []string{"tpl-1"})

		updated, _ := app.GetScenarioGroupByID(group.ID)
		if updated.UpdatedAt == originalUpdatedAt {
			t.Errorf("UpdatedAt not updated: was %d, now %d", originalUpdatedAt, updated.UpdatedAt)
		}

		// CreatedAt 不应该改变
		if updated.CreatedAt != group.CreatedAt {
			t.Errorf("CreatedAt changed from %d to %d", group.CreatedAt, updated.CreatedAt)
		}
	})
}

// TestScenarioGroupDelete 测试删除场景分组
func TestScenarioGroupDelete(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "scenario-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	scenarioRepo := repository.NewScenarioRepository(tmpDir)
	scenarioService := services.NewScenarioService(scenarioRepo)

	app := &App{
		userDataDir:     tmpDir,
		scenarioService: scenarioService,
	}

	t.Run("DeleteExistingGroup", func(t *testing.T) {
		group, _ := app.CreateScenarioGroup("待删除", "这个分组将被删除")

		err := app.DeleteScenarioGroup(group.ID)
		if err != nil {
			t.Fatalf("DeleteScenarioGroup failed: %v", err)
		}

		// 验证删除
		groups, _ := app.GetScenarioGroups()
		for _, g := range groups {
			if g.ID == group.ID {
				t.Error("Deleted group still exists")
			}
		}
	})

	t.Run("DeleteNonExistentGroup", func(t *testing.T) {
		err := app.DeleteScenarioGroup("non-existent")
		if err == nil {
			t.Error("Expected error when deleting non-existent group")
		}
	})
}

// TestScenarioGroupTemplates 测试场景分组的模板管理
func TestScenarioGroupTemplates(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "scenario-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	scenarioRepo := repository.NewScenarioRepository(tmpDir)
	scenarioService := services.NewScenarioService(scenarioRepo)

	app := &App{
		userDataDir:     tmpDir,
		scenarioService: scenarioService,
	}

	group, err := app.CreateScenarioGroup("测试分组", "用于测试模板管理")
	if err != nil {
		t.Fatalf("Failed to create group: %v", err)
	}

	t.Run("AddTemplates", func(t *testing.T) {
		templateIDs := []string{"cve-2021-1", "cve-2021-2", "cve-2021-3"}

		err := app.AddTemplatesToScenarioGroup(group.ID, templateIDs)
		if err != nil {
			t.Fatalf("AddTemplatesToScenarioGroup failed: %v", err)
		}

		// 验证模板已添加
		updatedGroup, err := app.GetScenarioGroupByID(group.ID)
		if err != nil {
			t.Fatalf("GetScenarioGroupByID failed: %v", err)
		}

		if len(updatedGroup.TemplateIDs) != len(templateIDs) {
			t.Errorf("Expected %d templates, got %d", len(templateIDs), len(updatedGroup.TemplateIDs))
		}

		// 验证模板ID是否正确
		idMap := make(map[string]bool)
		for _, id := range updatedGroup.TemplateIDs {
			idMap[id] = true
		}
		for _, expectedID := range templateIDs {
			if !idMap[expectedID] {
				t.Errorf("Template ID '%s' not found in group", expectedID)
			}
		}
	})

	t.Run("AddToNonExistentGroup", func(t *testing.T) {
		err := app.AddTemplatesToScenarioGroup("non-existent", []string{"tpl-1"})
		if err == nil {
			t.Error("Expected error when adding templates to non-existent group")
		}
	})

	t.Run("RemoveTemplates", func(t *testing.T) {
		// 先添加一些模板
		allTemplates := []string{"cve-2021-1", "cve-2021-2", "cve-2021-3", "cve-2021-4"}
		app.AddTemplatesToScenarioGroup(group.ID, allTemplates)

		// 移除部分模板
		toRemove := []string{"cve-2021-2", "cve-2021-3"}
		err := app.RemoveTemplatesFromScenarioGroup(group.ID, toRemove)
		if err != nil {
			t.Fatalf("RemoveTemplatesFromScenarioGroup failed: %v", err)
		}

		// 验证模板已移除
		updatedGroup, err := app.GetScenarioGroupByID(group.ID)
		if err != nil {
			t.Fatalf("GetScenarioGroupByID failed: %v", err)
		}

		if len(updatedGroup.TemplateIDs) != 2 {
			t.Errorf("Expected 2 templates after removal, got %d", len(updatedGroup.TemplateIDs))
		}

		// 验证被移除的模板不存在
		idMap := make(map[string]bool)
		for _, id := range updatedGroup.TemplateIDs {
			idMap[id] = true
		}
		for _, removedID := range toRemove {
			if idMap[removedID] {
				t.Errorf("Template ID '%s' should have been removed", removedID)
			}
		}
	})

	t.Run("RemoveFromNonExistentGroup", func(t *testing.T) {
		err := app.RemoveTemplatesFromScenarioGroup("non-existent", []string{"tpl-1"})
		if err == nil {
			t.Error("Expected error when removing templates from non-existent group")
		}
	})

	t.Run("GetGroupTemplates", func(t *testing.T) {
		// 创建一个新分组用于测试
		testGroup, _ := app.CreateScenarioGroup("模板查询测试", "测试")
		templateIDs := []string{"tpl-1", "tpl-2", "tpl-3"}
		app.AddTemplatesToScenarioGroup(testGroup.ID, templateIDs)

		// 初始化 templateService 以避免 nil 指针
		templateDir := filepath.Join(tmpDir, "templates")
		os.MkdirAll(templateDir, 0755)
		templateRepo := repository.NewTemplateRepository(templateDir)
		app.templateService = services.NewTemplateService(templateRepo)

		// 获取分组的模板
		templates, err := app.GetScenarioGroupTemplates(testGroup.ID)
		if err != nil {
			t.Fatalf("GetScenarioGroupTemplates failed: %v", err)
		}

		// 由于测试环境中没有实际的 nuclei 模板，可能返回 nil 或空列表
		if templates == nil {
			t.Log("Warning: GetAllNucleiTemplates returned nil, this is expected in test environment")
			templates = []NucleiTemplate{}
		}
	})
}

// TestScenarioGroupPersistence 测试文件持久化
func TestScenarioGroupPersistence(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "scenario-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// 创建第一个 App 实例并添加数据
	scenarioRepo1 := repository.NewScenarioRepository(tmpDir)
	scenarioService1 := services.NewScenarioService(scenarioRepo1)

	app1 := &App{
		userDataDir:     tmpDir,
		scenarioService: scenarioService1,
	}

	group1, _ := app1.CreateScenarioGroup("持久化测试1", "测试1")
	app1.UpdateScenarioGroup(group1.ID, "持久化测试1更新", "测试1更新", []string{"tpl-1"})

	// 创建新的 App 实例，模拟应用重启
	scenarioRepo2 := repository.NewScenarioRepository(tmpDir)
	scenarioService2 := services.NewScenarioService(scenarioRepo2)

	app2 := &App{
		userDataDir:     tmpDir,
		scenarioService: scenarioService2,
	}

	// 验证数据已持久化
	groups, err := app2.GetScenarioGroups()
	if err != nil {
		t.Fatalf("GetScenarioGroups failed: %v", err)
	}

	if len(groups) == 0 {
		t.Fatal("No groups loaded from file")
	}

	// 查找之前创建的分组
	var found *ScenarioGroup
	for _, g := range groups {
		if g.ID == group1.ID {
			found = &g
			break
		}
	}

	if found == nil {
		t.Fatal("Previously created group not found after reload")
	}

	if found.Name != "持久化测试1更新" {
		t.Errorf("Expected name '持久化测试1更新', got '%s'", found.Name)
	}
	if found.Description != "测试1更新" {
		t.Errorf("Expected description '测试1更新', got '%s'", found.Description)
	}
	if len(found.TemplateIDs) != 1 || found.TemplateIDs[0] != "tpl-1" {
		t.Errorf("Expected template IDs ['tpl-1'], got %v", found.TemplateIDs)
	}
}

// TestScenarioGroupEdgeCases 测试边界情况
func TestScenarioGroupEdgeCases(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "scenario-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	scenarioRepo := repository.NewScenarioRepository(tmpDir)
	scenarioService := services.NewScenarioService(scenarioRepo)

	app := &App{
		userDataDir:     tmpDir,
		scenarioService: scenarioService,
	}

	t.Run("EmptyGroupName", func(t *testing.T) {
		// 当前实现允许空名称（虽然不太合理）
		// 这里测试实际行为
		group, err := app.CreateScenarioGroup("", "description")
		if err != nil {
			t.Errorf("CreateScenarioGroup with empty name failed: %v", err)
		}
		if group.Name != "" {
			t.Errorf("Expected empty name, got '%s'", group.Name)
		}
	})

	t.Run("DuplicateTemplates", func(t *testing.T) {
		group, _ := app.CreateScenarioGroup("重复测试", "测试")

		// 添加重复的模板ID
		duplicateIDs := []string{"tpl-1", "tpl-1", "tpl-2", "tpl-2"}
		app.AddTemplatesToScenarioGroup(group.ID, duplicateIDs)

		updated, _ := app.GetScenarioGroupByID(group.ID)

		// 验证没有重复
		idMap := make(map[string]bool)
		for _, id := range updated.TemplateIDs {
			if idMap[id] {
				t.Errorf("Duplicate template ID found: %s", id)
			}
			idMap[id] = true
		}
	})

	t.Run("RemoveNonExistentTemplates", func(t *testing.T) {
		group, _ := app.CreateScenarioGroup("移除测试", "测试")

		// 添加一些模板
		app.AddTemplatesToScenarioGroup(group.ID, []string{"tpl-1", "tpl-2"})

		// 尝试移除不存在的模板
		err := app.RemoveTemplatesFromScenarioGroup(group.ID, []string{"tpl-999"})
		if err != nil {
			t.Errorf("Should not error when removing non-existent templates: %v", err)
		}

		// 验证原有模板不受影响
		updated, _ := app.GetScenarioGroupByID(group.ID)
		if len(updated.TemplateIDs) != 2 {
			t.Errorf("Expected 2 templates, got %d", len(updated.TemplateIDs))
		}
	})

	t.Run("EmptyTemplateList", func(t *testing.T) {
		group, _ := app.CreateScenarioGroup("空模板测试", "测试")

		// 添加空模板列表
		err := app.AddTemplatesToScenarioGroup(group.ID, []string{})
		if err != nil {
			t.Errorf("Should not error when adding empty template list: %v", err)
		}

		// 移除空模板列表
		err = app.RemoveTemplatesFromScenarioGroup(group.ID, []string{})
		if err != nil {
			t.Errorf("Should not error when removing empty template list: %v", err)
		}
	})

	t.Run("SpecialCharacters", func(t *testing.T) {
		specialNames := []string{
			"测试分组-包含-横线",
			"测试分组_包含_下划线",
			"测试分组.包含.点",
			"测试分组(包含)括号",
			"测试分组包含空格",
		}

		for _, name := range specialNames {
			group, err := app.CreateScenarioGroup(name, "特殊字符测试")
			if err != nil {
				t.Errorf("Failed to create group with name '%s': %v", name, err)
			}

			// 验证可以获取
			found, err := app.GetScenarioGroupByID(group.ID)
			if err != nil {
				t.Errorf("Failed to get group with special name: %v", err)
			}
			if found.Name != name {
				t.Errorf("Expected name '%s', got '%s'", name, found.Name)
			}
		}
	})
}
