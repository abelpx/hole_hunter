/**
 * 测试数据填充脚本
 * 用于开发和演示
 */

import { DatabaseManager } from './DatabaseManager';

export async function seedTestData(): Promise<void> {
  const db = DatabaseManager.getInstance();

  console.log('Seeding test data...');

  try {
    // 使用事务确保数据一致性
    await db.transaction(async () => {
      // 1. 创建测试目标
      const target1Id = await db.createTarget({
        name: 'Example Production',
        url: 'https://example.com',
        tags: ['production', 'web'],
      });

      const target2Id = await db.createTarget({
        name: 'Test API Server',
        url: 'https://api.test.com',
        tags: ['staging', 'api'],
      });

      const target3Id = await db.createTarget({
        name: 'Development Environment',
        url: 'http://localhost:3000',
        tags: ['dev', 'local'],
      });

      console.log('Created 3 test targets');

      // 2. 创建测试扫描任务
      const scan1Id = await db.createScanTask({
        target_id: target1Id,
        target_name: 'Example Production',
      });

      const scan2Id = await db.createScanTask({
        target_id: target2Id,
        target_name: 'Test API Server',
      });

      // 更新扫描任务状态
      await db.updateScanTask(scan1Id, {
        status: 'completed',
        progress: 100,
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date(Date.now() - 3000000).toISOString(),
      });

      await db.updateScanTask(scan2Id, {
        status: 'running',
        progress: 45,
        started_at: new Date(Date.now() - 600000).toISOString(),
        current_template: 'CVE-2021-44228',
      });

      console.log('Created 2 test scan tasks');

      // 3. 创建测试漏洞
      await db.batchCreateVulnerabilities([
        {
          id: 'vuln-001',
          name: 'Apache Log4j RCE',
          severity: 'critical',
          url: 'https://example.com/api',
          template_id: 'CVE-2021-44228',
          cve: ['CVE-2021-44228'],
          cvss: 10.0,
          description: 'Remote Code Execution (RCE) vulnerability in Log4j',
          reference: [
            'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
            'https://logging.apache.org/log4j/2.x/security.html',
          ],
          tags: ['rce', 'critical', 'log4j'],
          target_id: target1Id,
          scan_id: scan1Id,
        },
        {
          id: 'vuln-002',
          name: 'SQL Injection in Login Form',
          severity: 'high',
          url: 'https://example.com/login',
          template_id: 'sqli-login',
          cve: [],
          cvss: 8.6,
          description: 'SQL injection vulnerability in login form allows authentication bypass',
          reference: ['https://owasp.org/www-community/attacks/SQL_Injection'],
          tags: ['sqli', 'auth', 'injection'],
          target_id: target1Id,
          scan_id: scan1Id,
        },
        {
          id: 'vuln-003',
          name: 'Exposed .git Directory',
          severity: 'high',
          url: 'https://example.com/.git',
          template_id: 'exposed-git',
          cve: [],
          cvss: 7.5,
          description: 'Git repository exposed publicly',
          reference: ['https://github.com/aria7/White-Hacker-Educational-Materials/blob/master/accidental-exposure/git-leak.md'],
          tags: ['exposure', 'git', 'config'],
          target_id: target1Id,
          scan_id: scan1Id,
        },
        {
          id: 'vuln-004',
          name: 'Missing X-Frame-Options Header',
          severity: 'medium',
          url: 'https://example.com',
          template_id: 'missing-headers',
          cve: [],
          cvss: 5.3,
          description: 'X-Frame-Options header not set, potentially vulnerable to clickjacking',
          reference: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options'],
          tags: ['headers', 'clickjacking'],
          target_id: target1Id,
          scan_id: scan1Id,
        },
        {
          id: 'vuln-005',
          name: 'Information Disclosure',
          severity: 'low',
          url: 'https://example.com/api',
          template_id: 'info-disclosure',
          cve: [],
          cvss: 3.7,
          description: 'Server version information leaked in response headers',
          reference: [],
          tags: ['info', 'disclosure', 'headers'],
          target_id: target1Id,
          scan_id: scan1Id,
        },
      ]);

      console.log('Created 5 test vulnerabilities');

      // 创建一个误报示例
      await db.createVulnerability({
        id: 'vuln-fp-001',
        name: 'Potential XSS (False Positive)',
        severity: 'medium',
        url: 'https://example.com/search?q=test',
        template_id: 'xss-reflected',
        cve: [],
        cvss: 6.1,
        description: 'Reflected XSS that was verified as false positive',
        reference: [],
        tags: ['xss', 'false-positive'],
        target_id: target1Id,
        scan_id: scan1Id,
      });

      await db.updateVulnerability('vuln-fp-001', {
        is_false_positive: true,
      });

      console.log('Created 1 false positive example');
    });

    console.log('Test data seeded successfully!');

    // 输出统计信息
    const stats = await db.getStats();
    console.log('Database stats:', stats);

    const vulnStats = await db.getVulnerabilityStats();
    console.log('Vulnerability stats:', vulnStats);

  } catch (error) {
    console.error('Error seeding test data:', error);
    throw error;
  }
}
