package services

import (
	"path/filepath"
	"strings"

	"github.com/holehunter/holehunter/internal/models"
)

func ParseNucleiTemplate(content []byte, path, baseDir string) *models.NucleiTemplate {
	template := &models.NucleiTemplate{
		Path:     path,
		Enabled:  true,
		Metadata: make(map[string]string),
	}

	template.ID = extractTemplateID(content, path, baseDir)
	template.Category = extractTemplateCategory(path, baseDir)

	contentStr := string(content)

	infoBlock := extractInfoBlock(contentStr)
	if infoBlock == "" {
		template.Name = filepath.Base(path)
		return template
	}

	template.Name = extractTemplateName(infoBlock)
	template.Severity = extractTemplateSeverity(infoBlock)
	template.Author = extractTemplateAuthor(infoBlock)
	template.Description = extractMultilineField(infoBlock, "description:")
	template.Impact = extractMultilineField(infoBlock, "impact:")
	template.Remediation = extractMultilineField(infoBlock, "remediation:")
	template.Reference = extractReference(infoBlock)
	template.Tags = extractTemplateTags(infoBlock)

	if template.Name == "" {
		template.Name = filepath.Base(path)
	}

	return template
}

func extractTemplateID(content []byte, path, baseDir string) string {
	relPath, _ := filepath.Rel(baseDir, path)
	defaultID := strings.TrimSuffix(relPath, ".yaml")

	contentStr := string(content)
	if idx := strings.Index(contentStr, "id:"); idx > 0 {
		endIdx := strings.Index(contentStr[idx:], "\n")
		if endIdx > 0 {
			idLine := strings.TrimSpace(contentStr[idx+3 : idx+endIdx])
			return strings.Trim(strings.TrimSpace(idLine), "\"")
		}
	}

	return defaultID
}

func extractTemplateCategory(path, baseDir string) string {
	relPath, _ := filepath.Rel(baseDir, path)
	parts := strings.Split(relPath, string(filepath.Separator))
	if len(parts) > 0 {
		return parts[0]
	}
	return "other"
}

func extractInfoBlock(contentStr string) string {
	infoStart := strings.Index(contentStr, "info:")
	if infoStart < 0 {
		return ""
	}

	infoEnd := len(contentStr)
	for _, key := range []string{"\nhttp:", "\ndns:", "\nfile:", "\nnetwork:", "\nTCP:", "\nworkflow:"} {
		if idx := strings.Index(contentStr[infoStart:], key); idx > 0 && idx < infoEnd {
			infoEnd = infoStart + idx
		}
	}

	return contentStr[infoStart:infoEnd]
}

func extractTemplateName(infoBlock string) string {
	if idx := strings.Index(infoBlock, "name:"); idx > 0 {
		endIdx := strings.Index(infoBlock[idx:], "\n")
		if endIdx > 0 {
			nameLine := strings.TrimSpace(infoBlock[idx+5 : idx+endIdx])
			return strings.Trim(strings.TrimSpace(nameLine), "\"")
		}
	}
	return ""
}

func extractTemplateSeverity(infoBlock string) string {
	if idx := strings.Index(infoBlock, "severity:"); idx > 0 {
		endIdx := strings.Index(infoBlock[idx:], "\n")
		if endIdx > 0 {
			sevLine := strings.TrimSpace(infoBlock[idx+9 : idx+endIdx])
			return strings.Trim(strings.TrimSpace(sevLine), "\"")
		} else {
			sevLine := strings.TrimSpace(infoBlock[idx+9:])
			return strings.Trim(strings.TrimSpace(sevLine), "\"")
		}
	}
	return ""
}

func extractTemplateAuthor(infoBlock string) string {
	if idx := strings.Index(infoBlock, "author:"); idx > 0 {
		endIdx := strings.Index(infoBlock[idx:], "\n")
		if endIdx > 0 {
			authorLine := strings.TrimSpace(infoBlock[idx+7 : idx+endIdx])
			author := strings.Trim(strings.TrimSpace(authorLine), "\"")
			if len(author) > 30 {
				author = author[:30] + "..."
			}
			return author
		}
	}
	return ""
}

func extractMultilineField(infoBlock, fieldName string) string {
	if idx := strings.Index(infoBlock, fieldName); idx > 0 {
		lineStart := idx + len(fieldName)
		remainder := infoBlock[lineStart:]
		remainder = strings.TrimLeft(remainder, " \t\n\r")

		if strings.HasPrefix(remainder, "|") {
			return extractMultilineContent(remainder)
		}

		endIdx := strings.Index(remainder, "\n")
		if endIdx > 0 {
			return strings.Trim(strings.TrimSpace(remainder[:endIdx]), "\"")
		}
		return strings.Trim(strings.TrimSpace(remainder), "\"")
	}
	return ""
}

func extractMultilineContent(remainder string) string {
	pipeIdx := strings.Index(remainder, "\n")
	if pipeIdx < 0 {
		return ""
	}

	contentAfterPipe := remainder[pipeIdx+1:]
	lines := strings.Split(contentAfterPipe, "\n")
	var contentLines []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		if strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ") {
			if strings.Contains(trimmed, ":") {
				break
			}
		}

		if strings.HasPrefix(line, "    ") || strings.HasPrefix(line, "\t") {
			contentLines = append(contentLines, trimmed)
		}
	}

	return strings.Join(contentLines, " ")
}

func extractReference(infoBlock string) []string {
	if idx := strings.Index(infoBlock, "reference:"); idx > 0 {
		refStart := idx + 10
		refBlock := infoBlock[refStart:]

		lines := strings.Split(refBlock, "\n")
		var refs []string

		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "-") || strings.HasPrefix(line, "http") {
				if strings.HasPrefix(line, "- ") {
					line = strings.TrimPrefix(line, "- ")
				}
				if strings.HasPrefix(line, "http") {
					refs = append(refs, line)
				}
			} else {
				break
			}
		}

		if len(refs) > 0 {
			return refs
		}
	}
	return nil
}

func extractTemplateTags(infoBlock string) []string {
	idx := strings.Index(infoBlock, "tags:")
	if idx <= 0 {
		return nil
	}

	remainder := infoBlock[idx+5:]
	lines := strings.Split(remainder, "\n")

	if tags := extractCommaSeparatedTags(lines); tags != nil {
		return tags
	}

	return extractListTags(lines)
}

func extractCommaSeparatedTags(lines []string) []string {
	if len(lines) == 0 {
		return nil
	}

	line := strings.TrimSpace(lines[0])
	if strings.HasPrefix(line, "-") || strings.Contains(line, ":") {
		return nil
	}

	tagList := strings.Split(line, ",")
	var tags []string
	for _, t := range tagList {
		t = strings.TrimSpace(t)
		if t != "" {
			tags = append(tags, t)
		}
	}
	return tags
}

func extractListTags(lines []string) []string {
	var tags []string

	for i, originalLine := range lines {
		line := strings.TrimSpace(originalLine)
		if line == "" {
			continue
		}

		if i > 0 && isEndOfTagsSection(originalLine) {
			break
		}

		if tag := extractTagFromLine(line, originalLine); tag != "" {
			tags = append(tags, tag)
		}
	}

	return tags
}

func isEndOfTagsSection(line string) bool {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return false
	}
	if !strings.HasPrefix(line, " ") && !strings.HasPrefix(line, "\t") {
		return true
	}
	if strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "    ") && strings.Contains(trimmed, ":") {
		return true
	}
	return false
}

func extractTagFromLine(line, originalLine string) string {
	if strings.HasPrefix(line, "-") {
		tag := strings.TrimSpace(strings.TrimPrefix(line, "-"))
		return strings.Trim(tag, "\"'")
	}
	if strings.HasPrefix(originalLine, "    ") {
		tag := strings.Trim(line, "\"'")
		if tag != "" && !strings.Contains(tag, ":") {
			return tag
		}
	}
	return ""
}
