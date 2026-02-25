"""
NRLDC Intra-Day Forecast Scraper
---------------------------------
The site is a SPA — the URL never changes.
Structure:
  • Year folders  →  <button class="accordion-button folder-icon"
                              data-folderid="YYYY_ID" data-foldername="YYYY">
  • Clicking a year button opens the accordion and triggers a DataTable AJAX
    reload that shows month sub-folders (same button structure in the sidebar).
  • Clicking a month button loads the actual files in the DataTable.
  • Each file row has an 'action' column with a download anchor.

Strategy per year:
  1. Fresh driver.get(BASE_URL) → guarantees clean state between years.
  2. Click year button → accordion opens, months appear.
  3. Filter months: skip any month in the current year that is AFTER today.
  4. For each remaining month: find button directly, click, select 50 rows,
     download all, then look for a next-page button and paginate until done.
"""

import os
import glob
import time
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL = "https://nrldc.in/forecast/intra-day-forecast"
BASE_DOWNLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
)
os.makedirs(BASE_DOWNLOAD_DIR, exist_ok=True)

# Current date used to skip future months
TODAY = datetime.now()
MONTH_MAP = {
    "jan": 1,  "feb": 2,  "mar": 3,  "apr": 4,
    "may": 5,  "jun": 6,  "jul": 7,  "aug": 8,
    "sep": 9,  "oct": 10, "nov": 11, "dec": 12,
}

print("\n" + "=" * 72)
print("NRLDC INTRA-DAY FORECAST SCRAPER".center(72))
print("=" * 72)
print(f"Base directory : Smart-Grid-Load-Prediction-Using-Deep-Learning")
print(f"Current date   : {TODAY.strftime('%Y-%m-%d')} (skip future months)")
print("=" * 72 + "\n")


# ── Driver helpers ────────────────────────────────────────────────────────────
def get_driver(download_dir: str) -> webdriver.Chrome:
    abs_dir = os.path.abspath(download_dir)
    os.makedirs(abs_dir, exist_ok=True)
    options = webdriver.ChromeOptions()
    options.add_experimental_option("prefs", {
        "download.default_directory": abs_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True,
        "plugins.always_open_pdf_externally": True,
    })
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_experimental_option("excludeSwitches", ["enable-logging"])
    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options,
    )
    driver.execute_cdp_cmd("Page.setDownloadBehavior",
                           {"behavior": "allow", "downloadPath": abs_dir})
    return driver


def set_download_dir(driver: webdriver.Chrome, directory: str):
    abs_dir = os.path.abspath(directory)
    os.makedirs(abs_dir, exist_ok=True)
    driver.execute_cdp_cmd("Page.setDownloadBehavior",
                           {"behavior": "allow", "downloadPath": abs_dir})


def wait_for_downloads(directory: str, timeout: int = 90):
    """Block until no .crdownload / .tmp files remain."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        pending = (glob.glob(os.path.join(directory, "*.crdownload")) +
                   glob.glob(os.path.join(directory, "*.tmp")))
        if not pending:
            return True
        time.sleep(1)
    print("\n  [WARN] Download timeout — some files may be incomplete.")
    return False


def count_files(directory: str) -> int:
    return len([f for f in os.listdir(directory)
                if os.path.isfile(os.path.join(directory, f))])


def get_existing_files(directory: str) -> set:
    """Get set of filenames that already exist in directory."""
    try:
        return set(f for f in os.listdir(directory)
                   if os.path.isfile(os.path.join(directory, f)))
    except Exception:
        return set()


# ── Page helpers ──────────────────────────────────────────────────────────────
TABLE_ID = "operationsTable"
FOLDER_BTN_XPATH = "//button[contains(@class,'folder-icon') and @data-folderid]"


def wait_table_loaded(wait: WebDriverWait):
    try:
        wait.until(EC.invisibility_of_element_located(
            (By.CSS_SELECTOR, f"#{TABLE_ID}_processing")
        ))
    except Exception:
        pass
    time.sleep(2)


def click_btn(driver, el):
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
    driver.execute_script("arguments[0].click();", el)


def get_folder_buttons(driver):
    return driver.find_elements(By.XPATH, FOLDER_BTN_XPATH)


def find_btn_by_fid(driver, fid: str):
    """Find a folder button by its data-folderid. Returns None if not found."""
    try:
        return driver.find_element(
            By.XPATH,
            f"//button[contains(@class,'folder-icon') and @data-folderid='{fid}']"
        )
    except Exception:
        return None


def table_has_no_data(driver) -> bool:
    try:
        rows = driver.find_elements(By.CSS_SELECTOR, f"#{TABLE_ID} tbody tr")
        if len(rows) <= 1:
            txt = rows[0].text.strip().lower() if rows else ""
            return "no data" in txt or "no record" in txt or txt == ""
    except Exception:
        pass
    return False


def try_set_50_rows(driver):
    """Try to set the DataTable length to 50. Tries several selector patterns."""
    selectors = [
        f"#{TABLE_ID}_length select",
        f"select[name='{TABLE_ID}_length']",
        "select[name$='_length']",
        "select[name*='length']",
    ]
    for sel in selectors:
        try:
            el = driver.find_element(By.CSS_SELECTOR, sel)
            opts = [o.text.strip() for o in el.find_elements(By.TAG_NAME, "option")]
            target = "50" if "50" in opts else max(opts, key=lambda x: int(x) if x.isdigit() else 0)
            Select(el).select_by_visible_text(target)
            return True
        except Exception:
            continue
    return False


def get_download_links(driver):
    """Return all download anchors from the current table page."""
    for icon_cls in ["fa-download", "glyphicon-download-alt", "download-icon"]:
        links = driver.find_elements(
            By.XPATH,
            f"//*[@id='{TABLE_ID}']//a[.//i[contains(@class,'{icon_cls}')]]"
        )
        if links:
            return links, f"icon·{icon_cls}"

    links = driver.find_elements(
        By.XPATH,
        f"//*[@id='{TABLE_ID}']//a["
        "contains(@href,'.xls') or contains(@href,'.xlsx') or "
        "contains(@href,'.csv') or contains(@href,'.pdf') or "
        "contains(@href,'.zip')]"
    )
    if links:
        return links, "href-ext"

    links = driver.find_elements(
        By.XPATH, f"//*[@id='{TABLE_ID}']//tbody//a[@href]"
    )
    if links:
        return links, "any-anchor"

    return [], "none"


def _find_link_by_href(driver, href: str, timeout: float = 4):
    """
    Try multiple strategies to locate an anchor with a given href.
    Returns the WebElement or None.
    """
    # Strategy 1: exact attribute match anywhere on page (not table-scoped)
    try:
        return WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, f"//a[@href='{href}']"))
        )
    except Exception:
        pass

    # Strategy 2: table-scoped exact match (original approach)
    try:
        return driver.find_element(
            By.XPATH, f"//*[@id='{TABLE_ID}']//a[@href='{href}']"
        )
    except Exception:
        pass

    # Strategy 3: match by the filename portion at end of href (handles encoding quirks)
    try:
        filename_part = href.rsplit("/", 1)[-1].rsplit("?", 1)[0]
        if filename_part:
            return driver.find_element(
                By.XPATH,
                f"//*[@id='{TABLE_ID}']//a[contains(@href, '{filename_part}')]"
            )
    except Exception:
        pass

    return None


def click_download_links(driver, links, existing_files: set):
    """
    Click download links reliably even when the table re-renders between clicks.
    Collects all hrefs first, then iterates over the string list so stale
    element references never cause a crash.  Falls back to JS navigation.
    """
    any_clicked = False

    # Snapshot hrefs while the elements are still live
    hrefs = []
    for link in links:
        try:
            href = link.get_attribute("href")
            if href:
                hrefs.append(href)
        except Exception:
            pass  # stale already — skip

    for idx, href in enumerate(hrefs, start=1):
        clicked = False
        # --- Attempt 1: find element and JS-click it ---
        for attempt in range(3):
            el = _find_link_by_href(driver, href, timeout=5)
            if el is not None:
                try:
                    driver.execute_script(
                        "arguments[0].scrollIntoView({block:'center'});", el
                    )
                    driver.execute_script("arguments[0].click();", el)
                    time.sleep(0.8)
                    clicked = True
                    break
                except Exception as e:
                    if "stale element" in str(e).lower() and attempt < 2:
                        time.sleep(0.5)
                        continue
                    break  # non-stale error — fall through to JS nav
            else:
                break  # element genuinely not found — fall through

        # --- Attempt 2: direct JS navigation (triggers browser download) ---
        if not clicked:
            try:
                driver.execute_script(
                    "var a=document.createElement('a');"
                    "a.href=arguments[0]; a.download=''; "
                    "document.body.appendChild(a); a.click(); "
                    "document.body.removeChild(a);",
                    href
                )
                time.sleep(0.8)
                clicked = True
            except Exception as e2:
                print(f"\n     [WARN] Click {idx} failed: {e2}", end="")

        if clicked:
            any_clicked = True

    return any_clicked


def month_is_future(year: int, month_name: str) -> bool:
    """Return True if this year+month combination is after TODAY."""
    num = MONTH_MAP.get(month_name.lower()[:3])
    if num is None:
        return False   # unknown month name — don't skip
    # Skip if the month hasn't started yet relative to today
    return year > TODAY.year or (year == TODAY.year and num > TODAY.month)


def open_year(driver, wait, year_fid: str) -> bool:
    """
    Navigate to BASE_URL fresh and click the year accordion button.
    Returns True on success.
    """
    driver.get(BASE_URL)
    time.sleep(4)
    btn = find_btn_by_fid(driver, year_fid)
    if btn is None:
        print(f"  [ERROR] Year button {year_fid} not found after page reload.")
        return False
    click_btn(driver, btn)
    wait_table_loaded(wait)
    return True


# ── Main ──────────────────────────────────────────────────────────────────────
driver = get_driver(BASE_DOWNLOAD_DIR)
wait = WebDriverWait(driver, 30)

try:
    # ── Step 1: Collect year folder IDs from initial page load ────────────────
    driver.get(BASE_URL)
    time.sleep(4)

    year_data: list[tuple[str, str]] = []   # [(year_name, year_fid), ...]
    for btn in get_folder_buttons(driver):
        name = (btn.get_attribute("data-foldername") or "").strip()
        fid  = btn.get_attribute("data-folderid") or ""
        if name.isdigit() and len(name) == 4:
            year_data.append((name, fid))

    if not year_data:
        print("[ERROR] No year buttons found. Page structure may have changed.")
        for b in get_folder_buttons(driver):
            print(f"  fid='{b.get_attribute('data-folderid')}'  name='{b.get_attribute('data-foldername')}'")
    else:
        print(f"Years detected : {', '.join([y[0] for y in year_data])}\n")

    year_fids_set = {fid for _, fid in year_data}

    # ── Step 2: Iterate years ─────────────────────────────────────────────────
    for year_name, year_fid in year_data:
        year_int = int(year_name)
        print("-" * 72)
        print(f"YEAR {year_name}".center(72))
        print("-" * 72)
        year_dir = os.path.join(BASE_DOWNLOAD_DIR, year_name)
        os.makedirs(year_dir, exist_ok=True)

        # Always reload the page fresh for each year — guarantees clean state
        if not open_year(driver, wait, year_fid):
            continue

        # Collect month folder IDs (sidebar is now open for this year)
        month_data: list[tuple[str, str]] = []
        for btn in get_folder_buttons(driver):
            fid  = btn.get_attribute("data-folderid") or ""
            name = (btn.get_attribute("data-foldername") or "").strip()
            if fid not in year_fids_set and name:
                month_data.append((name, fid))

        if not month_data:
            print("  [WARN] No months found. Table rows:")
            for row in driver.find_elements(By.CSS_SELECTOR, f"#{TABLE_ID} tbody tr"):
                print(f"    {row.text.strip()[:120]}")
            continue

        # Apply date filter — skip months that haven't happened yet
        filtered = [(n, f) for n, f in month_data
                    if not month_is_future(year_int, n)]
        skipped  = [n for n, _ in month_data if month_is_future(year_int, n)]
        if skipped:
            print(f"  Skipping future months : {', '.join(skipped)}")
        print(f"  Processing months      : {', '.join([m[0] for m in filtered])}")

        # ── Step 3: Iterate months ────────────────────────────────────────────
        for month_name, month_fid in filtered:
            print(f"\n  Month: {month_name}", end="", flush=True)
            month_dir = os.path.join(year_dir, month_name)
            os.makedirs(month_dir, exist_ok=True)
            set_download_dir(driver, month_dir)

            # Find the month button in the already-open sidebar
            month_btn = find_btn_by_fid(driver, month_fid)
            if month_btn is None:
                # Fallback: re-open year accordion and retry once
                print(" [recovering]", end="", flush=True)
                if not open_year(driver, wait, year_fid):
                    print(" [SKIP] could not recover")
                    continue
                month_btn = find_btn_by_fid(driver, month_fid)
                if month_btn is None:
                    print(" [SKIP] button not found after recovery")
                    continue

            click_btn(driver, month_btn)
            wait_table_loaded(wait)

            if table_has_no_data(driver):
                print(" [SKIP] no data")
                continue

            # Set 50 rows per page
            if try_set_50_rows(driver):
                wait_table_loaded(wait)

            # Download all pages
            total_downloaded = 0
            total_skipped = 0
            page = 1
            skip_month = False
            
            while True:
                links, strategy = get_download_links(driver)
                if not links:
                    if page == 1:
                        rows = driver.find_elements(By.CSS_SELECTOR, f"#{TABLE_ID} tbody tr")
                        print(f" [WARN] no download links ({len(rows)} rows):")
                        for r in rows[:3]:
                            print(f"       {r.text.strip()[:120]}")
                    break

                print(f" [page {page}: {len(links)} files | {strategy}]", end="", flush=True)
                
                # On page 1, check if all files already exist
                if page == 1:
                    existing_before = get_existing_files(month_dir)
                    # If directory already has reasonable number of files, likely everything exists
                    if len(existing_before) >= len(links):
                        print(f" [SKIP] {len(links)} file(s) already exist", end="")
                        total_skipped += len(links)
                        skip_month = True
                        break
                
                if skip_month:
                    break
                
                # Get files that exist before download
                existing_before = get_existing_files(month_dir)
                
                # Click downloads
                click_download_links(driver, links, existing_before)
                wait_for_downloads(month_dir, timeout=90)
                
                # Get files that exist after download
                existing_after = get_existing_files(month_dir)
                
                # Calculate new vs skipped
                new_files = existing_after - existing_before
                newly_downloaded = len(new_files)
                skipped = len(links) - newly_downloaded
                
                total_downloaded += newly_downloaded
                total_skipped += skipped

                # Check for DataTable "Next" button
                try:
                    next_btn = driver.find_element(
                        By.CSS_SELECTOR, f"#{TABLE_ID}_next:not(.disabled)"
                    )
                    click_btn(driver, next_btn)
                    wait_table_loaded(wait)
                    page += 1
                except Exception:
                    break  # no more pages

            summary = f"{total_downloaded} new"
            if total_skipped > 0:
                summary += f", {total_skipped} skipped"
            relative_dir = os.path.relpath(month_dir, BASE_DOWNLOAD_DIR)
            print(f"\n    Result: {summary} file(s) | {relative_dir}")

finally:
    driver.quit()

print("\n" + "=" * 72)
print("SCRAPING COMPLETE".center(72))
print("=" * 72 + "\n")