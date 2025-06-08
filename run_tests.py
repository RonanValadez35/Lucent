#!/usr/bin/env python
"""
Script to run tests with the correct Python path
"""
import os
import sys
import pytest
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run tests for the dating app backend')
    parser.add_argument('--cov', action='store_true', help='Enable coverage report')
    parser.add_argument('--html', action='store_true', help='Generate HTML coverage report')
    parser.add_argument('--verbose', '-v', action='count', default=0, help='Verbosity level')
    parser.add_argument('path', nargs='*', default=['tests'], help='Test path(s) to run')
    
    args = parser.parse_args()
    
    # Add the current directory to Python path
    sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
    
    # Build pytest arguments
    pytest_args = args.path
    
    # Add verbosity
    if args.verbose:
        pytest_args.extend(['-' + 'v' * args.verbose])
    
    # Add coverage
    if args.cov:
        pytest_args.extend(['--cov=app'])
        
        if args.html:
            pytest_args.extend(['--cov-report=html'])
        else:
            pytest_args.extend(['--cov-report=term-missing'])
    
    # Run pytest with arguments
    sys.exit(pytest.main(pytest_args)) 