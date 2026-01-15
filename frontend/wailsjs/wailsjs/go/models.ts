export namespace models {
	
	export class DashboardStats {
	    total_targets: number;
	    total_scans: number;
	    running_scans: number;
	    total_vulnerabilities: number;
	    critical_vulns: number;
	    high_vulns: number;
	    medium_vulns: number;
	    low_vulns: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_targets = source["total_targets"];
	        this.total_scans = source["total_scans"];
	        this.running_scans = source["running_scans"];
	        this.total_vulnerabilities = source["total_vulnerabilities"];
	        this.critical_vulns = source["critical_vulns"];
	        this.high_vulns = source["high_vulns"];
	        this.medium_vulns = source["medium_vulns"];
	        this.low_vulns = source["low_vulns"];
	    }
	}
	export class NucleiStatus {
	    available: boolean;
	    version: string;
	    path: string;
	    embedded: boolean;
	    platform: string;
	    installed: boolean;
	    templates_dir?: string;
	    template_count?: number;
	    offline_mode: boolean;
	    ready: boolean;
	
	    static createFrom(source: any = {}) {
	        return new NucleiStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.version = source["version"];
	        this.path = source["path"];
	        this.embedded = source["embedded"];
	        this.platform = source["platform"];
	        this.installed = source["installed"];
	        this.templates_dir = source["templates_dir"];
	        this.template_count = source["template_count"];
	        this.offline_mode = source["offline_mode"];
	        this.ready = source["ready"];
	    }
	}
	export class NucleiTemplate {
	    id: string;
	    name: string;
	    severity: string;
	    author: string;
	    path: string;
	    category: string;
	    tags: string[];
	    enabled: boolean;
	    description?: string;
	    impact?: string;
	    remediation?: string;
	    reference?: string[];
	    metadata?: Record<string, string>;
	
	    static createFrom(source: any = {}) {
	        return new NucleiTemplate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.severity = source["severity"];
	        this.author = source["author"];
	        this.path = source["path"];
	        this.category = source["category"];
	        this.tags = source["tags"];
	        this.enabled = source["enabled"];
	        this.description = source["description"];
	        this.impact = source["impact"];
	        this.remediation = source["remediation"];
	        this.reference = source["reference"];
	        this.metadata = source["metadata"];
	    }
	}
	export class ScanTask {
	    id: number;
	    name?: string;
	    target_id: number;
	    status: string;
	    strategy: string;
	    templates_used: string[];
	    started_at?: string;
	    completed_at?: string;
	    total_templates?: number;
	    executed_templates?: number;
	    progress: number;
	    current_template?: string;
	    error?: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new ScanTask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.target_id = source["target_id"];
	        this.status = source["status"];
	        this.strategy = source["strategy"];
	        this.templates_used = source["templates_used"];
	        this.started_at = source["started_at"];
	        this.completed_at = source["completed_at"];
	        this.total_templates = source["total_templates"];
	        this.executed_templates = source["executed_templates"];
	        this.progress = source["progress"];
	        this.current_template = source["current_template"];
	        this.error = source["error"];
	        this.created_at = source["created_at"];
	    }
	}
	export class Target {
	    id: number;
	    name: string;
	    url: string;
	    description: string;
	    tags: string[];
	    created_at: string;
	    updated_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Target(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.url = source["url"];
	        this.description = source["description"];
	        this.tags = source["tags"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	    }
	}
	export class Vulnerability {
	    id: number;
	    task_id: number;
	    template_id: string;
	    severity: string;
	    name: string;
	    description: string;
	    url: string;
	    matched_at: string;
	    tags?: string[];
	    reference?: string[];
	    request_response?: string;
	    false_positive: boolean;
	    notes?: string;
	    cve?: string;
	    cvss?: number;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Vulnerability(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.task_id = source["task_id"];
	        this.template_id = source["template_id"];
	        this.severity = source["severity"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.url = source["url"];
	        this.matched_at = source["matched_at"];
	        this.tags = source["tags"];
	        this.reference = source["reference"];
	        this.request_response = source["request_response"];
	        this.false_positive = source["false_positive"];
	        this.notes = source["notes"];
	        this.cve = source["cve"];
	        this.cvss = source["cvss"];
	        this.created_at = source["created_at"];
	    }
	}

}

