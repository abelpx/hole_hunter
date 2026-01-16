export namespace models {
	
	export class BrutePayloadSet {
	    id: number;
	    name: string;
	    type: string;
	    config: Record<string, any>;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new BrutePayloadSet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.config = source["config"];
	        this.created_at = source["created_at"];
	    }
	}
	export class BruteResult {
	    task_id: number;
	    payload: string;
	    result: string;
	    success: boolean;
	    response_time: number;
	    error?: string;
	    timestamp: string;
	    metadata?: Record<string, any>;
	
	    static createFrom(source: any = {}) {
	        return new BruteResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.task_id = source["task_id"];
	        this.payload = source["payload"];
	        this.result = source["result"];
	        this.success = source["success"];
	        this.response_time = source["response_time"];
	        this.error = source["error"];
	        this.timestamp = source["timestamp"];
	        this.metadata = source["metadata"];
	    }
	}
	export class BruteTask {
	    id: number;
	    name: string;
	    request_id: number;
	    type: string;
	    status: string;
	    total_payloads: number;
	    sent_payloads: number;
	    success_count: number;
	    failure_count: number;
	    started_at: string;
	    completed_at: string;
	    created_at: string;
	    updated_at: string;
	
	    static createFrom(source: any = {}) {
	        return new BruteTask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.request_id = source["request_id"];
	        this.type = source["type"];
	        this.status = source["status"];
	        this.total_payloads = source["total_payloads"];
	        this.sent_payloads = source["sent_payloads"];
	        this.success_count = source["success_count"];
	        this.failure_count = source["failure_count"];
	        this.started_at = source["started_at"];
	        this.completed_at = source["completed_at"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	    }
	}
	export class CreateTemplateRequest {
	    name: string;
	    content: string;
	    severity: string;
	    category: string;
	    author: string;
	    description: string;
	    tags: string[];
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CreateTemplateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.content = source["content"];
	        this.severity = source["severity"];
	        this.category = source["category"];
	        this.author = source["author"];
	        this.description = source["description"];
	        this.tags = source["tags"];
	        this.enabled = source["enabled"];
	    }
	}
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
	export class DomainBruteResult {
	    id: number;
	    task_id: number;
	    subdomain: string;
	    resolved: boolean;
	    ips: string[];
	    latency: number;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new DomainBruteResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.task_id = source["task_id"];
	        this.subdomain = source["subdomain"];
	        this.resolved = source["resolved"];
	        this.ips = source["ips"];
	        this.latency = source["latency"];
	        this.created_at = source["created_at"];
	    }
	}
	export class HttpRequest {
	    id: number;
	    name: string;
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	    content_type: string;
	    tags: string[];
	    created_at: string;
	    updated_at: string;
	
	    static createFrom(source: any = {}) {
	        return new HttpRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.content_type = source["content_type"];
	        this.tags = source["tags"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	    }
	}
	export class HttpResponse {
	    id: number;
	    request_id: number;
	    status_code: number;
	    status_text: string;
	    headers: Record<string, string>;
	    body: string;
	    body_size: number;
	    header_size: number;
	    duration: number;
	    timestamp: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new HttpResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.request_id = source["request_id"];
	        this.status_code = source["status_code"];
	        this.status_text = source["status_text"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.body_size = source["body_size"];
	        this.header_size = source["header_size"];
	        this.duration = source["duration"];
	        this.timestamp = source["timestamp"];
	        this.created_at = source["created_at"];
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
	export class PortScanResult {
	    id: number;
	    task_id: number;
	    port: number;
	    status: string;
	    service: string;
	    banner: string;
	    latency: number;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new PortScanResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.task_id = source["task_id"];
	        this.port = source["port"];
	        this.status = source["status"];
	        this.service = source["service"];
	        this.banner = source["banner"];
	        this.latency = source["latency"];
	        this.created_at = source["created_at"];
	    }
	}
	export class Report {
	    id: number;
	    name: string;
	    scan_id: number;
	    type: string;
	    format: string;
	    file_path: string;
	    file_size: number;
	    status: string;
	    config: Record<string, any>;
	    created_at: string;
	    generated_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Report(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.scan_id = source["scan_id"];
	        this.type = source["type"];
	        this.format = source["format"];
	        this.file_path = source["file_path"];
	        this.file_size = source["file_size"];
	        this.status = source["status"];
	        this.config = source["config"];
	        this.created_at = source["created_at"];
	        this.generated_at = source["generated_at"];
	    }
	}
	export class ScanProgress {
	    task_id: number;
	    status: string;
	    total_templates: number;
	    executed_templates: number;
	    progress: number;
	    current_template: string;
	    vuln_count: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new ScanProgress(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.task_id = source["task_id"];
	        this.status = source["status"];
	        this.total_templates = source["total_templates"];
	        this.executed_templates = source["executed_templates"];
	        this.progress = source["progress"];
	        this.current_template = source["current_template"];
	        this.vuln_count = source["vuln_count"];
	        this.error = source["error"];
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
	export class ScenarioGroup {
	    id: string;
	    name: string;
	    description: string;
	    templateIds: string[];
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new ScenarioGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.templateIds = source["templateIds"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
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
	export class Template {
	    id: number;
	    source: string;
	    template_id: string;
	    name: string;
	    severity: string;
	    category: string;
	    author: string;
	    path: string;
	    content: string;
	    enabled: boolean;
	    description: string;
	    impact: string;
	    remediation: string;
	    tags: string[];
	    reference: string[];
	    metadata: Record<string, string>;
	    nuclei_version?: string;
	    official_path?: string;
	    created_at: string;
	    updated_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Template(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.source = source["source"];
	        this.template_id = source["template_id"];
	        this.name = source["name"];
	        this.severity = source["severity"];
	        this.category = source["category"];
	        this.author = source["author"];
	        this.path = source["path"];
	        this.content = source["content"];
	        this.enabled = source["enabled"];
	        this.description = source["description"];
	        this.impact = source["impact"];
	        this.remediation = source["remediation"];
	        this.tags = source["tags"];
	        this.reference = source["reference"];
	        this.metadata = source["metadata"];
	        this.nuclei_version = source["nuclei_version"];
	        this.official_path = source["official_path"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	    }
	}
	export class TemplateFilterUnified {
	    page: number;
	    pageSize: number;
	    source: string;
	    category: string;
	    search: string;
	    severity: string;
	    author: string;
	    enabled?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TemplateFilterUnified(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	        this.source = source["source"];
	        this.category = source["category"];
	        this.search = source["search"];
	        this.severity = source["severity"];
	        this.author = source["author"];
	        this.enabled = source["enabled"];
	    }
	}
	export class UpdateTemplateRequest {
	    name?: string;
	    content?: string;
	    severity?: string;
	    category?: string;
	    author?: string;
	    description?: string;
	    tags?: string[];
	    enabled?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UpdateTemplateRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.content = source["content"];
	        this.severity = source["severity"];
	        this.category = source["category"];
	        this.author = source["author"];
	        this.description = source["description"];
	        this.tags = source["tags"];
	        this.enabled = source["enabled"];
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
	export class VulnerabilityFilter {
	    page: number;
	    pageSize: number;
	    severity: string[];
	    target_id?: number;
	    scan_id?: number;
	    is_false_positive?: boolean;
	    tags: string[];
	    search: string;
	
	    static createFrom(source: any = {}) {
	        return new VulnerabilityFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.page = source["page"];
	        this.pageSize = source["pageSize"];
	        this.severity = source["severity"];
	        this.target_id = source["target_id"];
	        this.scan_id = source["scan_id"];
	        this.is_false_positive = source["is_false_positive"];
	        this.tags = source["tags"];
	        this.search = source["search"];
	    }
	}

}

