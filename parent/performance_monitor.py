"""
Performance Monitoring Service for Multi-Client-Site Dashboard
Tracks provisioning times, API response times, and system metrics
"""

import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import asyncio
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    metric_type: str
    value: float
    timestamp: datetime
    client_site_id: Optional[str] = None
    endpoint: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ProvisioningMetric:
    """Tenant provisioning performance metric"""
    client_site_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    steps: List[Dict[str, Any]] = None
    success: bool = False
    error_message: Optional[str] = None


class PerformanceMonitor:
    """Performance monitoring service"""
    
    def __init__(self, max_metrics: int = 10000, provisioning_timeout: int = 90):
        self.max_metrics = max_metrics
        self.provisioning_timeout = provisioning_timeout
        
        # Metric storage
        self.metrics: deque = deque(maxlen=max_metrics)
        self.active_provisioning: Dict[str, ProvisioningMetric] = {}
        self.completed_provisioning: deque = deque(maxlen=1000)
        
        # Aggregated statistics
        self.hourly_stats: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))
        self.daily_stats: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: defaultdict(list))
        
        logger.info(f"PerformanceMonitor initialized with max_metrics={max_metrics}, timeout={provisioning_timeout}s")
    
    def record_metric(self, metric: PerformanceMetric) -> None:
        """Record a performance metric"""
        self.metrics.append(metric)
        
        # Update hourly and daily statistics
        hour_key = metric.timestamp.strftime("%Y-%m-%d-%H")
        day_key = metric.timestamp.strftime("%Y-%m-%d")
        
        if metric.metric_type == "api_response_time":
            self.hourly_stats[hour_key]["api_response_times"].append(metric.value)
            self.daily_stats[day_key]["api_response_times"].append(metric.value)
        elif metric.metric_type == "database_query_time":
            self.hourly_stats[hour_key]["db_query_times"].append(metric.value)
            self.daily_stats[day_key]["db_query_times"].append(metric.value)
    
    def start_provisioning(self, client_site_id: str) -> None:
        """Start tracking client site provisioning"""
        if client_site_id in self.active_provisioning:
            logger.warning(f"Provisioning already active for client site {client_site_id}")
            return
        
        provisioning_metric = ProvisioningMetric(
            client_site_id=client_site_id,
            start_time=datetime.now(),
            steps=[]
        )
        
        self.active_provisioning[client_site_id] = provisioning_metric
        logger.info(f"Started provisioning tracking for client site {client_site_id}")
    
    def record_provisioning_step(self, client_site_id: str, step_name: str, success: bool = True, error: Optional[str] = None) -> None:
        """Record a provisioning step"""
        if client_site_id not in self.active_provisioning:
            logger.warning(f"No active provisioning for client site {client_site_id}")
            return
        
        step = {
            "name": step_name,
            "timestamp": datetime.now().isoformat(),
            "success": success,
            "error": error
        }
        
        self.active_provisioning[client_site_id].steps.append(step)
        
        if not success:
            self.active_provisioning[client_site_id].error_message = error
            logger.error(f"Provisioning step failed for client site {client_site_id}: {step_name} - {error}")
        else:
            logger.info(f"Provisioning step completed for client site {client_site_id}: {step_name}")
    
    def complete_provisioning(self, client_site_id: str, success: bool = True, error_message: Optional[str] = None) -> None:
        """Complete client site provisioning tracking"""
        if client_site_id not in self.active_provisioning:
            logger.warning(f"No active provisioning for client site {client_site_id}")
            return
        
        provisioning = self.active_provisioning[client_site_id]
        provisioning.end_time = datetime.now()
        provisioning.duration_seconds = (provisioning.end_time - provisioning.start_time).total_seconds()
        provisioning.success = success
        provisioning.error_message = error_message
        
        # Record provisioning duration metric
        if provisioning.duration_seconds:
            metric = PerformanceMetric(
                metric_type="provisioning_duration",
                value=provisioning.duration_seconds,
                timestamp=provisioning.end_time,
                client_site_id=client_site_id,
                metadata={"success": success, "steps": len(provisioning.steps)}
            )
            self.record_metric(metric)
        
        # Move to completed queue
        self.completed_provisioning.append(provisioning)
        del self.active_provisioning[client_site_id]
        
        logger.info(f"Completed provisioning for client site {client_site_id}: {success} in {provisioning.duration_seconds:.2f}s")
        
        # Alert if provisioning took too long
        if provisioning.duration_seconds and provisioning.duration_seconds > self.provisioning_timeout:
            logger.error(f"🐌 SLOW PROVISIONING ALERT: Client site {client_site_id} took {provisioning.duration_seconds:.2f}s (threshold: {self.provisioning_timeout}s)")
    
    def record_api_response_time(self, endpoint: str, response_time: float, client_site_id: Optional[str] = None, status_code: Optional[int] = None) -> None:
        """Record API response time"""
        metric = PerformanceMetric(
            metric_type="api_response_time",
            value=response_time,
            timestamp=datetime.now(),
            client_site_id=client_site_id,
            endpoint=endpoint,
            metadata={"status_code": status_code}
        )
        self.record_metric(metric)
        
        # Alert on slow responses
        if response_time > 5.0:  # 5 second threshold
            logger.warning(f"🐌 SLOW API RESPONSE: {endpoint} took {response_time:.2f}s for client site {client_site_id}")
    
    def record_database_query_time(self, query_type: str, query_time: float, client_site_id: Optional[str] = None, table: Optional[str] = None) -> None:
        """Record database query time"""
        metric = PerformanceMetric(
            metric_type="database_query_time",
            value=query_time,
            timestamp=datetime.now(),
            client_site_id=client_site_id,
            metadata={"query_type": query_type, "table": table}
        )
        self.record_metric(metric)
        
        # Alert on slow queries
        if query_time > 1.0:  # 1 second threshold
            logger.warning(f"🐌 SLOW DATABASE QUERY: {query_type} on {table} took {query_time:.2f}s for client site {client_site_id}")
    
    def get_provisioning_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get provisioning statistics for the last N hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        relevant_provisioning = [
            p for p in self.completed_provisioning 
            if p.end_time and p.end_time >= cutoff_time
        ]
        
        if not relevant_provisioning:
            return {"message": "No provisioning data available for the specified period"}
        
        durations = [p.duration_seconds for p in relevant_provisioning if p.duration_seconds]
        successful_count = sum(1 for p in relevant_provisioning if p.success)
        total_count = len(relevant_provisioning)
        
        stats = {
            "period_hours": hours,
            "total_provisioning": total_count,
            "successful_provisioning": successful_count,
            "failed_provisioning": total_count - successful_count,
            "success_rate": successful_count / total_count if total_count > 0 else 0,
            "average_duration": statistics.mean(durations) if durations else 0,
            "median_duration": statistics.median(durations) if durations else 0,
            "min_duration": min(durations) if durations else 0,
            "max_duration": max(durations) if durations else 0,
            "provisioning_over_threshold": sum(1 for d in durations if d > self.provisioning_timeout),
            "threshold_seconds": self.provisioning_timeout
        }
        
        return stats
    
    def get_api_performance_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get API performance statistics for the last N hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        relevant_metrics = [
            m for m in self.metrics 
            if m.metric_type == "api_response_time" and m.timestamp >= cutoff_time
        ]
        
        if not relevant_metrics:
            return {"message": "No API performance data available for the specified period"}
        
        response_times = [m.value for m in relevant_metrics]
        
        # Group by endpoint
        endpoint_stats = defaultdict(list)
        for metric in relevant_metrics:
            if metric.endpoint:
                endpoint_stats[metric.endpoint].append(metric.value)
        
        endpoint_averages = {
            endpoint: statistics.mean(times) if times else 0
            for endpoint, times in endpoint_stats.items()
        }
        
        stats = {
            "period_hours": hours,
            "total_api_calls": len(response_times),
            "average_response_time": statistics.mean(response_times) if response_times else 0,
            "median_response_time": statistics.median(response_times) if response_times else 0,
            "min_response_time": min(response_times) if response_times else 0,
            "max_response_time": max(response_times) if response_times else 0,
            "slow_calls_over_5s": sum(1 for rt in response_times if rt > 5.0),
            "slow_calls_over_1s": sum(1 for rt in response_times if rt > 1.0),
            "endpoint_averages": endpoint_averages
        }
        
        return stats
    
    def get_current_alerts(self) -> List[Dict[str, Any]]:
        """Get current performance alerts"""
        alerts = []
        
        # Check for slow provisioning
        for client_site_id, provisioning in self.active_provisioning.items():
            elapsed = (datetime.now() - provisioning.start_time).total_seconds()
            if elapsed > self.provisioning_timeout:
                alerts.append({
                    "type": "slow_provisioning",
                    "severity": "error",
                    "message": f"Client site {client_site_id} provisioning is taking too long ({elapsed:.1f}s)",
                    "client_site_id": client_site_id,
                    "duration_seconds": elapsed,
                    "threshold": self.provisioning_timeout
                })
        
        # Check for recent slow API responses (last hour)
        cutoff_time = datetime.now() - timedelta(hours=1)
        recent_slow_calls = [
            m for m in self.metrics 
            if m.metric_type == "api_response_time" 
            and m.timestamp >= cutoff_time 
            and m.value > 5.0
        ]
        
        if recent_slow_calls:
            slow_endpoints = defaultdict(int)
            for metric in recent_slow_calls:
                if metric.endpoint:
                    slow_endpoints[metric.endpoint] += 1
            
            for endpoint, count in slow_endpoints.items():
                alerts.append({
                    "type": "slow_api_responses",
                    "severity": "warning",
                    "message": f"Endpoint {endpoint} had {count} slow responses (>5s) in the last hour",
                    "endpoint": endpoint,
                    "count": count
                })
        
        return alerts
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status"""
        provisioning_stats = self.get_provisioning_stats(1)  # Last hour
        api_stats = self.get_api_performance_stats(1)  # Last hour
        alerts = self.get_current_alerts()
        
        # Determine overall health
        health_status = "healthy"
        if alerts:
            severities = [alert["severity"] for alert in alerts]
            if "error" in severities:
                health_status = "unhealthy"
            elif "warning" in severities:
                health_status = "degraded"
        
        return {
            "status": health_status,
            "timestamp": datetime.now().isoformat(),
            "alerts": alerts,
            "provisioning_stats": provisioning_stats,
            "api_performance": api_stats,
            "active_provisioning_count": len(self.active_provisioning),
            "metrics_stored": len(self.metrics)
        }
    
    def export_metrics(self, format: str = "json") -> str:
        """Export metrics in specified format"""
        data = {
            "export_timestamp": datetime.now().isoformat(),
            "provisioning_stats": self.get_provisioning_stats(24),
            "api_performance_stats": self.get_api_performance_stats(24),
            "health_status": self.get_health_status(),
            "recent_metrics": [asdict(m) for m in list(self.metrics)[-1000:]],  # Last 1000 metrics
            "recent_provisioning": [asdict(p) for p in list(self.completed_provisioning)[-100:]]  # Last 100 completions
        }
        
        if format.lower() == "json":
            return json.dumps(data, indent=2, default=str)
        else:
            raise ValueError(f"Unsupported export format: {format}")


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance"""
    return performance_monitor


# Convenience functions for recording metrics
def record_api_response_time(endpoint: str, response_time: float, client_site_id: Optional[str] = None, status_code: Optional[int] = None) -> None:
    """Record API response time"""
    monitor = get_performance_monitor()
    monitor.record_api_response_time(endpoint, response_time, client_site_id, status_code)


def record_database_query_time(query_type: str, query_time: float, client_site_id: Optional[str] = None, table: Optional[str] = None) -> None:
    """Record database query time"""
    monitor = get_performance_monitor()
    monitor.record_database_query_time(query_type, query_time, client_site_id, table)


def start_provisioning_tracking(client_site_id: str) -> None:
    """Start tracking client site provisioning"""
    monitor = get_performance_monitor()
    monitor.start_provisioning(client_site_id)


def record_provisioning_step(client_site_id: str, step_name: str, success: bool = True, error: Optional[str] = None) -> None:
    """Record a provisioning step"""
    monitor = get_performance_monitor()
    monitor.record_provisioning_step(client_site_id, step_name, success, error)


def complete_provisioning_tracking(client_site_id: str, success: bool = True, error_message: Optional[str] = None) -> None:
    """Complete client site provisioning tracking"""
    monitor = get_performance_monitor()
    monitor.complete_provisioning(client_site_id, success, error_message)


if __name__ == "__main__":
    # Example usage and testing
    print("🚀 Performance Monitor Test")
    print("=" * 50)
    
    monitor = get_performance_monitor()
    
    # Simulate some metrics
    monitor.start_provisioning("test-client-site-1")
    time.sleep(0.5)
    monitor.record_provisioning_step("test-client-site-1", "dns_setup", True)
    time.sleep(0.3)
    monitor.record_provisioning_step("test-client-site-1", "database_creation", True)
    time.sleep(0.2)
    monitor.complete_provisioning_tracking("test-client-site-1", True)
    
    # Record some API metrics
    monitor.record_api_response_time("/api/users", 0.150, "test-client-site-1", 200)
    monitor.record_api_response_time("/api/tasks", 0.250, "test-client-site-1", 200)
    monitor.record_database_query_time("SELECT", 0.050, "test-client-site-1", "users")
    
    # Get stats
    print("\n📊 Provisioning Stats (24h):")
    provisioning_stats = monitor.get_provisioning_stats(24)
    print(json.dumps(provisioning_stats, indent=2, default=str))
    
    print("\n📊 API Performance Stats (24h):")
    api_stats = monitor.get_api_performance_stats(24)
    print(json.dumps(api_stats, indent=2, default=str))
    
    print("\n🚨 Current Alerts:")
    alerts = monitor.get_current_alerts()
    print(json.dumps(alerts, indent=2, default=str))
    
    print("\n🏥 Health Status:")
    health = monitor.get_health_status()
    print(json.dumps(health, indent=2, default=str))