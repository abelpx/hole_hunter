export namespace main {
	
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
	    }
	}
	export class DomainBruteTask {
	    id: number;
	    domain: string;
	    wordlist: string[];
	    timeout: number;
	    batch_size: number;
	    status: string;
	    started_at: string;
	    completed_at: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new DomainBruteTask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.domain = source["domain"];
	        this.wordlist = source["wordlist"];
	        this.timeout = source["timeout"];
	        this.batch_size = source["batch_size"];
	        this.status = source["status"];
	        this.started_at = source["started_at"];
	        this.completed_at = source["completed_at"];
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
	export class PortScanResult {
	    id: number;
	    task_id: number;
	    port: number;
	    status: string;
	    service: string;
	    banner: string;
	    latency: number;
	
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
	    }
	}
	export class PortScanTask {
	    id: number;
	    target: string;
	    ports: number[];
	    timeout: number;
	    batch_size: number;
	    status: string;
	    started_at: string;
	    completed_at: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new PortScanTask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.target = source["target"];
	        this.ports = source["ports"];
	        this.timeout = source["timeout"];
	        this.batch_size = source["batch_size"];
	        this.status = source["status"];
	        this.started_at = source["started_at"];
	        this.completed_at = source["completed_at"];
	        this.created_at = source["created_at"];
	    }
	}
	export class ScanTask {
	    id: number;
	    target_id: number;
	    status: string;
	    strategy: string;
	    templates_used: string[];
	    started_at: string;
	    completed_at: string;
	    total_templates: number;
	    executed_templates: number;
	    progress: number;
	    current_template: string;
	    error: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new ScanTask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
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
	    false_positive: boolean;
	    notes: string;
	    cve: string;
	    cvss: number;
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
	        this.false_positive = source["false_positive"];
	        this.notes = source["notes"];
	        this.cve = source["cve"];
	        this.cvss = source["cvss"];
	        this.created_at = source["created_at"];
	    }
	}

}

