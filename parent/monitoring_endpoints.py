"""
Monitoring and Performance API Endpoints
Provides health checks, metrics, and performance monitoring
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from performance_monitor import (
    get_performance_monitor, 
    record_api_response_time,
    PerformanceMonitor
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    System health check endpoint
    Returns overall system health status and current alerts
    """
    start_time = datetime.now()
    
    try:
        monitor = get_performance_monitor()
        health_status = monitor.get_health_status()
        
        # Record this API call
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/health", response_time, status_code=200)
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/health", response_time, status_code=500)
        
        raise HTTPException(status_code=500, detail="Health check failed")


@router.get("/metrics")
async def get_metrics(
    hours: Optional[int] = 24,
    metric_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get performance metrics
    
    Args:
        hours: Number of hours to look back (default: 24)
        metric_type: Filter by metric type (provisioning, api, database)
    """
    start_time = datetime.now()
    
    try:
        monitor = get_performance_monitor()
        
        metrics_data = {
            "period_hours": hours,
            "timestamp": datetime.now().isoformat(),
            "provisioning_stats": monitor.get_provisioning_stats(hours),
            "api_performance_stats": monitor.get_api_performance_stats(hours),
            "alerts": monitor.get_current_alerts()
        }
        
        # Filter by metric type if specified
        if metric_type == "provisioning":
            metrics_data = {
                "period_hours": hours,
                "timestamp": datetime.now().isoformat(),
                "provisioning_stats": metrics_data["provisioning_stats"]
            }
        elif metric_type == "api":
            metrics_data = {
                "period_hours": hours,
                "timestamp": datetime.now().isoformat(),
                "api_performance_stats": metrics_data["api_performance_stats"]
            }
        
        # Record this API call
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/metrics", response_time, status_code=200)
        
        return metrics_data
        
    except Exception as e:
        logger.error(f"Metrics retrieval failed: {e}")
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/metrics", response_time, status_code=500)
        
        raise HTTPException(status_code=500, detail="Metrics retrieval failed")


@router.get("/provisioning-performance")
async def get_provisioning_performance(hours: Optional[int] = 24) -> Dict[str, Any]:
    """
    Get client site provisioning performance metrics
    
    Args:
        hours: Number of hours to look back (default: 24)
    """
    start_time = datetime.now()
    
    try:
        monitor = get_performance_monitor()
        provisioning_stats = monitor.get_provisioning_stats(hours)
        
        # Add 90-second threshold analysis
        if isinstance(provisioning_stats, dict) and "provisioning_over_threshold" in provisioning_stats:
            threshold_violations = provisioning_stats["provisioning_over_threshold"]
            total_provisioning = provisioning_stats.get("total_provisioning", 0)
            
            provisioning_stats["threshold_analysis"] = {
                "violations": threshold_violations,
                "total": total_provisioning,
                "violation_rate": threshold_violations / total_provisioning if total_provisioning > 0 else 0,
                "threshold_seconds": 90,
                "recommendation": "Investigate slow provisioning steps" if threshold_violations > 0 else "All provisioning within acceptable limits"
            }
        
        # Record this API call
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/provisioning-performance", response_time, status_code=200)
        
        return {
            "period_hours": hours,
            "timestamp": datetime.now().isoformat(),
            "provisioning_performance": provisioning_stats
        }
        
    except Exception as e:
        logger.error(f"Provisioning performance retrieval failed: {e}")
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/provisioning-performance", response_time, status_code=500)
        
        raise HTTPException(status_code=500, detail="Provisioning performance retrieval failed")


@router.get("/api-performance")
async def get_api_performance(hours: Optional[int] = 24) -> Dict[str, Any]:
    """
    Get API performance metrics
    
    Args:
        hours: Number of hours to look back (default: 24)
    """
    start_time = datetime.now()
    
    try:
        monitor = get_performance_monitor()
        api_stats = monitor.get_api_performance_stats(hours)
        
        # Add performance analysis
        if isinstance(api_stats, dict) and "average_response_time" in api_stats:
            avg_response_time = api_stats["average_response_time"]
            slow_calls_1s = api_stats.get("slow_calls_over_1s", 0)
            slow_calls_5s = api_stats.get("slow_calls_over_5s", 0)
            total_calls = api_stats.get("total_api_calls", 0)
            
            performance_grade = "A"  # Excellent
            if avg_response_time > 1.0:
                performance_grade = "B"  # Good
            if avg_response_time > 2.0:
                performance_grade = "C"  # Fair
            if avg_response_time > 5.0:
                performance_grade = "D"  # Poor
            
            api_stats["performance_analysis"] = {
                "response_time_grade": performance_grade,
                "slow_calls_1s": slow_calls_1s,
                "slow_calls_5s": slow_calls_5s,
                "slow_call_rate_1s": slow_calls_1s / total_calls if total_calls > 0 else 0,
                "slow_call_rate_5s": slow_calls_5s / total_calls if total_calls > 0 else 0,
                "recommendation": "Monitor slow endpoints" if slow_calls_5s > 0 else "API performance optimal"
            }
        
        # Record this API call
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/api-performance", response_time, status_code=200)
        
        return {
            "period_hours": hours,
            "timestamp": datetime.now().isoformat(),
            "api_performance": api_stats
        }
        
    except Exception as e:
        logger.error(f"API performance retrieval failed: {e}")
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/api-performance", response_time, status_code=500)
        
        raise HTTPException(status_code=500, detail="API performance retrieval failed")


@router.get("/alerts")
async def get_alerts() -> Dict[str, Any]:
    """Get current performance alerts"""
    start_time = datetime.now()
    
    try:
        monitor = get_performance_monitor()
        alerts = monitor.get_current_alerts()
        
        # Categorize alerts
        categorized_alerts = {
            "errors": [alert for alert in alerts if alert.get("severity") == "error"],
            "warnings": [alert for alert in alerts if alert.get("severity") == "warning"],
            "info": [alert for alert in alerts if alert.get("severity") == "info"]
        }
        
        # Record this API call
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/alerts", response_time, status_code=200)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "total_alerts": len(alerts),
            "alerts": categorized_alerts,
            "system_status": "healthy" if not alerts else "degraded" if categorized_alerts["warnings"] else "unhealthy"
        }
        
    except Exception as e:
        logger.error(f"Alerts retrieval failed: {e}")
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/alerts", response_time, status_code=500)
        
        raise HTTPException(status_code=500, detail="Alerts retrieval failed")


@router.get("/export")
async def export_metrics(format: str = "json") -> JSONResponse:
    """
    Export performance metrics in various formats
    
    Args:
        format: Export format (json, csv) - currently only JSON supported
    """
    start_time = datetime.now()
    
    try:
        monitor = get_performance_monitor()
        exported_data = monitor.export_metrics(format)
        
        # Record this API call
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/export", response_time, status_code=200)
        
        return JSONResponse(
            content=json.loads(exported_data),
            media_type="application/json"
        )
        
    except Exception as e:
        logger.error(f"Metrics export failed: {e}")
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/export", response_time, status_code=500)
        
        raise HTTPException(status_code=500, detail="Metrics export failed")


@router.get("/dashboard")
async def get_dashboard_data() -> Dict[str, Any]:
    """
    Get comprehensive dashboard data for monitoring
    Returns key metrics and performance indicators
    """
    start_time = datetime.now()
    
    try:
        monitor = get_performance_monitor()
        
        # Get all key metrics
        provisioning_stats = monitor.get_provisioning_stats(24)
        api_stats = monitor.get_api_performance_stats(24)
        alerts = monitor.get_current_alerts()
        health_status = monitor.get_health_status()
        
        # Create dashboard summary
        dashboard_data = {
            "timestamp": datetime.now().isoformat(),
            "system_health": health_status,
            "key_metrics": {
                "provisioning": {
                    "total_24h": provisioning_stats.get("total_provisioning", 0) if isinstance(provisioning_stats, dict) else 0,
                    "success_rate": provisioning_stats.get("success_rate", 0) if isinstance(provisioning_stats, dict) else 0,
                    "avg_duration": provisioning_stats.get("average_duration", 0) if isinstance(provisioning_stats, dict) else 0,
                    "violations_90s": provisioning_stats.get("provisioning_over_threshold", 0) if isinstance(provisioning_stats, dict) else 0
                },
                "api_performance": {
                    "avg_response_time": api_stats.get("average_response_time", 0) if isinstance(api_stats, dict) else 0,
                    "total_calls_24h": api_stats.get("total_api_calls", 0) if isinstance(api_stats, dict) else 0,
                    "slow_calls_5s": api_stats.get("slow_calls_over_5s", 0) if isinstance(api_stats, dict) else 0
                },
                "alerts": {
                    "total": len(alerts),
                    "errors": len([a for a in alerts if a.get("severity") == "error"]),
                    "warnings": len([a for a in alerts if a.get("severity") == "warning"])
                }
            },
            "performance_summary": {
                "provisioning_grade": "A" if (provisioning_stats.get("provisioning_over_threshold", 0) if isinstance(provisioning_stats, dict) else 0) == 0 else "B",
                "api_grade": "A" if (api_stats.get("average_response_time", 0) if isinstance(api_stats, dict) else 0) < 1.0 else "B",
                "overall_status": "healthy" if not alerts else "degraded"
            }
        }
        
        # Record this API call
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/dashboard", response_time, status_code=200)
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Dashboard data retrieval failed: {e}")
        response_time = (datetime.now() - start_time).total_seconds()
        record_api_response_time("/api/monitoring/dashboard", response_time, status_code=500)
        
        raise HTTPException(status_code=500, detail="Dashboard data retrieval failed")