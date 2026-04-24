#!/usr/bin/env python3
"""
Complete Subscription System Test
Tests all aspects of the user-based subscription system
"""

import requests
import json
import sys
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TOKEN = None  # Will be set from command line

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name: str):
    print(f"\n{Colors.BLUE}🧪 Test: {name}{Colors.END}")

def print_pass(message: str):
    print(f"{Colors.GREEN}✅ PASS: {message}{Colors.END}")

def print_fail(message: str):
    print(f"{Colors.RED}❌ FAIL: {message}{Colors.END}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠️  WARNING: {message}{Colors.END}")

def get_headers() -> Dict[str, str]:
    if TOKEN:
        return {
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json"
        }
    return {"Content-Type": "application/json"}

# ============================================
# TEST 1: Get Subscription Plans (Public)
# ============================================
def test_get_plans():
    print_test("Get Subscription Plans (Public)")
    
    try:
        response = requests.get(f"{API_BASE_URL}/subscriptions/plans")
        
        if response.status_code == 200:
            plans = response.json()
            
            if len(plans) == 3:
                print_pass(f"Found 3 plans: {[p['name'] for p in plans]}")
                
                # Check each plan
                plan_names = [p['name'] for p in plans]
                if 'free' in plan_names and 'pro' in plan_names and 'enterprise' in plan_names:
                    print_pass("All required plans exist (free, pro, enterprise)")
                else:
                    print_fail(f"Missing plans. Found: {plan_names}")
                
                # Check free plan limits
                free_plan = next((p for p in plans if p['name'] == 'free'), None)
                if free_plan:
                    features = free_plan.get('features', {})
                    max_workspaces = features.get('max_workspaces')
                    max_team_members = features.get('max_team_members_total')
                    max_pages = features.get('max_pages')
                    
                    if max_workspaces == 5:
                        print_pass("Free plan: max_workspaces = 5 ✓")
                    else:
                        print_fail(f"Free plan: max_workspaces = {max_workspaces} (expected 5)")
                    
                    if max_team_members == 5:
                        print_pass("Free plan: max_team_members_total = 5 ✓")
                    else:
                        print_fail(f"Free plan: max_team_members_total = {max_team_members} (expected 5)")
                    
                    if max_pages == -1:
                        print_pass("Free plan: max_pages = unlimited ✓")
                    else:
                        print_fail(f"Free plan: max_pages = {max_pages} (expected -1/unlimited)")
                
                return True
            else:
                print_fail(f"Expected 3 plans, found {len(plans)}")
                return False
        else:
            print_fail(f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

# ============================================
# TEST 2: Get Current Subscription (Authenticated)
# ============================================
def test_get_current_subscription():
    print_test("Get Current Subscription (User-Level)")
    
    if not TOKEN:
        print_warning("Skipped - No auth token provided")
        return None
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/subscriptions/current",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check structure
            if 'subscription' in data and 'plan' in data and 'usage' in data:
                print_pass("Response has correct structure (subscription, plan, usage)")
                
                plan_name = data['plan'].get('name')
                print_pass(f"Current plan: {plan_name}")
                
                # Check usage data
                usage = data.get('usage', {})
                if 'max_workspaces' in usage:
                    ws_usage = usage['max_workspaces']
                    print_pass(f"Workspaces: {ws_usage['current']} / {ws_usage['limit']}")
                else:
                    print_warning("No workspace usage data")
                
                if 'max_team_members_total' in usage:
                    tm_usage = usage['max_team_members_total']
                    print_pass(f"Team Members Total: {tm_usage['current']} / {tm_usage['limit']}")
                else:
                    print_warning("No team members usage data")
                
                return True
            else:
                print_fail(f"Invalid response structure: {data.keys()}")
                return False
        else:
            print_fail(f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

# ============================================
# TEST 3: Check Workspace Limit
# ============================================
def test_check_workspace_limit():
    print_test("Check Workspace Limit")
    
    if not TOKEN:
        print_warning("Skipped - No auth token provided")
        return None
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/subscriptions/check-limit/max_workspaces?increment=1",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if 'allowed' in data and 'current' in data and 'limit' in data:
                print_pass(f"Limit check works: {data}")
                
                if data['limit'] == 5 or data['limit'] == -1:
                    print_pass(f"Workspace limit: {data['limit']} (5 for free, -1 for unlimited)")
                else:
                    print_warning(f"Unexpected limit: {data['limit']}")
                
                return True
            else:
                print_fail(f"Invalid response: {data}")
                return False
        else:
            print_fail(f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

# ============================================
# TEST 4: Check Usage Stats
# ============================================
def test_get_usage_stats():
    print_test("Get Usage Statistics")
    
    if not TOKEN:
        print_warning("Skipped - No auth token provided")
        return None
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/subscriptions/usage",
            headers=get_headers()
        )
        
        if response.status_code == 200:
            data = response.json()
            
            if 'usage' in data:
                print_pass("Usage stats retrieved")
                
                usage = data['usage']
                for metric, values in usage.items():
                    if isinstance(values, dict):
                        current = values.get('current', 0)
                        limit = values.get('limit', 'unknown')
                        percentage = values.get('percentage', 0)
                        print(f"  - {metric}: {current}/{limit} ({percentage}%)")
                
                return True
            else:
                print_fail(f"No usage data in response: {data}")
                return False
        else:
            print_fail(f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_fail(f"Exception: {str(e)}")
        return False

# ============================================
# TEST 5: Backend Service Check
# ============================================
def test_backend_service():
    print_test("Backend Service Configuration")
    
    import os
    
    # Check if UserSubscriptionService file exists
    service_file = "backend/app/services/user_subscription_service.py"
    if os.path.exists(service_file):
        print_pass(f"UserSubscriptionService file exists: {service_file}")
    else:
        print_fail(f"UserSubscriptionService file missing: {service_file}")
        return False
    
    # Check if subscriptions.py imports UserSubscriptionService
    endpoints_file = "backend/app/api/endpoints/subscriptions.py"
    if os.path.exists(endpoints_file):
        with open(endpoints_file, 'r') as f:
            content = f.read()
            if 'UserSubscriptionService' in content:
                print_pass("subscriptions.py imports UserSubscriptionService ✓")
            else:
                print_fail("subscriptions.py still uses old SubscriptionService")
                return False
            
            if 'workspace_id: str' in content and 'get_current_subscription' in content:
                print_fail("subscriptions.py still has workspace_id parameters")
                return False
            else:
                print_pass("subscriptions.py uses user-level endpoints ✓")
    else:
        print_warning(f"Cannot check {endpoints_file}")
    
    return True

# ============================================
# TEST 6: Frontend Integration Check
# ============================================
def test_frontend_integration():
    print_test("Frontend Integration")
    
    import os
    
    # Check api.ts
    api_file = "src/lib/api.ts"
    if os.path.exists(api_file):
        with open(api_file, 'r') as f:
            content = f.read()
            
            # Check getCurrentSubscription doesn't use workspace_id
            if 'getCurrentSubscription()' in content or 'getCurrentSubscription() {' in content:
                print_pass("api.ts: getCurrentSubscription() has no workspace_id parameter ✓")
            elif 'getCurrentSubscription(workspaceId' in content:
                print_fail("api.ts: getCurrentSubscription still uses workspaceId parameter")
                return False
            
            # Check API call doesn't include workspace_id
            if '/subscriptions/current?workspace_id=' in content:
                print_fail("api.ts: API call still includes workspace_id query parameter")
                return False
            elif '/subscriptions/current' in content:
                print_pass("api.ts: API call uses user-level endpoint ✓")
    else:
        print_warning(f"Cannot check {api_file}")
    
    # Check useSubscription hook
    hook_file = "src/hooks/useSubscription.ts"
    if os.path.exists(hook_file):
        with open(hook_file, 'r') as f:
            content = f.read()
            
            if 'currentWorkspace.id' in content and 'getCurrentSubscription' in content:
                print_fail("useSubscription.ts: Still depends on currentWorkspace")
                return False
            else:
                print_pass("useSubscription.ts: No workspace dependency ✓")
    else:
        print_warning(f"Cannot check {hook_file}")
    
    return True

# ============================================
# MAIN TEST RUNNER
# ============================================
def main():
    print(f"\n{Colors.BLUE}{'='*60}")
    print("🧪 SUBSCRIPTION SYSTEM - COMPLETE TEST SUITE")
    print(f"{'='*60}{Colors.END}\n")
    
    # Get token from command line
    global TOKEN
    if len(sys.argv) > 1:
        TOKEN = sys.argv[1]
        print(f"Using auth token: {TOKEN[:20]}...")
    else:
        print_warning("No auth token provided. Some tests will be skipped.")
        print("Usage: python test_subscription_system_complete.py YOUR_AUTH_TOKEN\n")
    
    results = []
    
    # Run tests
    results.append(("Get Plans", test_get_plans()))
    results.append(("Get Current Subscription", test_get_current_subscription()))
    results.append(("Check Workspace Limit", test_check_workspace_limit()))
    results.append(("Get Usage Stats", test_get_usage_stats()))
    results.append(("Backend Service", test_backend_service()))
    results.append(("Frontend Integration", test_frontend_integration()))
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}")
    print("📊 TEST SUMMARY")
    print(f"{'='*60}{Colors.END}\n")
    
    passed = sum(1 for _, result in results if result is True)
    failed = sum(1 for _, result in results if result is False)
    skipped = sum(1 for _, result in results if result is None)
    total = len(results)
    
    for name, result in results:
        if result is True:
            print(f"{Colors.GREEN}✅ {name}{Colors.END}")
        elif result is False:
            print(f"{Colors.RED}❌ {name}{Colors.END}")
        else:
            print(f"{Colors.YELLOW}⚠️  {name} (skipped){Colors.END}")
    
    print(f"\n{Colors.BLUE}Results: {passed} passed, {failed} failed, {skipped} skipped out of {total} tests{Colors.END}")
    
    if failed == 0 and passed > 0:
        print(f"\n{Colors.GREEN}🎉 ALL TESTS PASSED! Subscription system is working correctly.{Colors.END}\n")
        return 0
    elif failed > 0:
        print(f"\n{Colors.RED}❌ SOME TESTS FAILED. Please check the errors above.{Colors.END}\n")
        return 1
    else:
        print(f"\n{Colors.YELLOW}⚠️  TESTS INCOMPLETE. Provide auth token for full testing.{Colors.END}\n")
        return 2

if __name__ == "__main__":
    sys.exit(main())
