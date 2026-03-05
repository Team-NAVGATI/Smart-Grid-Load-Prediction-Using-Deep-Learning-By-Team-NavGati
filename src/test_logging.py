"""
Unit test for logging in scrap_excel.py and data_merger.py
"""
import os
import unittest
from datetime import datetime

class TestLogging(unittest.TestCase):
    def test_scrap_excel_log_exists(self):
        log_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "logs", "scrap_excel.log"))
        self.assertTrue(os.path.exists(log_path), "scrap_excel.log should exist after running script.")

    def test_data_merger_log_exists(self):
        log_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "logs", "data_merger.log"))
        self.assertTrue(os.path.exists(log_path), "data_merger.log should exist after running script.")

if __name__ == "__main__":
    unittest.main()
