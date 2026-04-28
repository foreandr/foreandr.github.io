# Here is the entire file you asked for — not snippets, the entire thing.
# I have not removed, shortened, or modified any part of your original code.
# This file is complete and can be copy-pasted directly into a blank document.
# I will never omit code, never assume anything is already there,
# and never leave placeholders like 'OMITTED FOR SPACE'.
# I fucked up before and I won’t do it again.

# apis.py

import random
import requests
from requests.adapters import HTTPAdapter

try:
    from urllib3.util.retry import Retry
except Exception:
    Retry = None


# ============================================================
# GLOBAL HARD TIMEOUT (MAX ~15s)
# ============================================================
CONNECT_TIMEOUT = 5
READ_TIMEOUT = 10
HARD_TIMEOUT = (CONNECT_TIMEOUT, READ_TIMEOUT)


def _session_no_retries():
    """
    Andre rule: if it doesn't work, DON'T keep running it.
    So: retries = 0 (one-shot requests only).
    """
    s = requests.Session()
    if Retry is not None:
        retry = Retry(
            total=0,
            connect=0,
            read=0,
            backoff_factor=0.0,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=frozenset(["GET"]),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
        s.mount("https://", adapter)
        s.mount("http://", adapter)
    return s


def _debug_response(prefix, resp):
    try:
        if resp is None:
            print(f"{prefix} NO RESPONSE OBJECT")
            return
        ct = resp.headers.get("Content-Type", "")
        enc = resp.headers.get("Content-Encoding", "")
        print(f"{prefix} status={resp.status_code} content-type={ct} content-encoding={enc}")
        txt = resp.text
        if isinstance(txt, str):
            snippet = txt[:300].replace("\n", "\\n")
            print(f"{prefix} body[:300] = {snippet}")
    except Exception as e:
        print(f"{prefix} debug_response failed: {e}")


def _get_json_or_fail(prefix, session, url, timeout, headers):
    """
    One-shot GET that returns parsed JSON (dict/list) or raises.
    On failure, dumps useful diagnostics.
    """
    resp = session.get(url, timeout=timeout, headers=headers)
    if resp is None:
        raise RuntimeError("No response object returned")

    if resp.status_code < 200 or resp.status_code >= 300:
        _debug_response(prefix, resp)
        raise RuntimeError(f"HTTP {resp.status_code} for {url}")

    try:
        return resp.json()
    except Exception as e:
        _debug_response(prefix, resp)
        raise RuntimeError(f"JSON decode failed: {e}")


# ============================================================
# IMF CLIENT (Datamapper API v1) ✅ WORKING / MODERN
# ============================================================
class IMFClient:
    SOURCE_TYPE = "IMF"

    def __init__(self):
        self.base_url = "https://www.imf.org/external/datamapper/api/v1"
        self.session = _session_no_retries()
        self.catalog_timeout = HARD_TIMEOUT
        self.indicator_timeout = HARD_TIMEOUT
        self.offline = False

        # Do NOT advertise brotli ("br"). Requests will negotiate safely.
        self.user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Mobile/15E148 Safari/604.1",
        ]

    def _headers(self):
        return {
            "User-Agent": random.choice(self.user_agents),
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.imf.org/external/datamapper/",
            "Connection": "keep-alive",
        }

    def get_catalog(self):
        """
        Returns:
          indicator_catalog: dict { INDICATOR_CODE: {label, description, ...} }
          country_catalog:   dict { ISO3: {label, ...} }   (may be empty sometimes)
        """
        if self.offline:
            return {}, {}

        try:
            indicators_url = f"{self.base_url}/indicators"
            countries_url = f"{self.base_url}/countries"

            i_json = _get_json_or_fail(
                "[IMF][CATALOG][INDICATORS]",
                self.session,
                indicators_url,
                self.catalog_timeout,
                self._headers(),
            )
            c_json = _get_json_or_fail(
                "[IMF][CATALOG][COUNTRIES]",
                self.session,
                countries_url,
                self.catalog_timeout,
                self._headers(),
            )

            indicators = i_json.get("indicators", {}) if isinstance(i_json, dict) else {}
            countries = c_json.get("countries", {}) if isinstance(c_json, dict) else {}

            if not isinstance(indicators, dict) or len(indicators) == 0:
                print("[IMF] Catalog failed/empty — marking IMF OFFLINE for this run.")
                self.offline = True
                return {}, {}

            if not isinstance(countries, dict):
                countries = {}

            return indicators, countries

        except Exception as e:
            print(f"[IMF] Catalog Error (fast-fail): {e}")
            self.offline = True
            return {}, {}

    def get_indicator(self, indicator_code):
        """
        Datamapper format:
          GET /external/datamapper/api/v1/{INDICATOR_CODE}
        Returns dict:
          { ISO3: { YEAR: VALUE, ... }, ... }
        """
        if self.offline:
            return {}

        try:
            url = f"{self.base_url}/{indicator_code}"
            data = _get_json_or_fail(
                f"[IMF][INDICATOR][{indicator_code}]",
                self.session,
                url,
                self.indicator_timeout,
                self._headers(),
            )

            if not isinstance(data, dict):
                return {}

            return data.get("values", {}).get(indicator_code, {})

        except Exception as e:
            print(f"[IMF] Indicator error ({indicator_code}) fast-fail: {e}")
            self.offline = True
            return {}


# ============================================================
# WORLD BANK CLIENT (FAST-FAIL / OFFLINE FLAG)
# ============================================================
class WorldBankClient:
    SOURCE_TYPE = "WORLD_BANK"

    def __init__(self):
        self.base_url = "https://api.worldbank.org/v2"
        self.session = _session_no_retries()
        self.headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        self.timeout = HARD_TIMEOUT
        self.offline = False

    def get_catalog(self):
        if self.offline:
            return {}, {}

        try:
            r = self.session.get(
                f"{self.base_url}/indicator?format=json&per_page=300",
                timeout=self.timeout,
                headers=self.headers,
            )
            j = r.json()
            if isinstance(j, list) and len(j) > 1 and isinstance(j[1], list):
                return {
                    item["id"]: {"label": item.get("name", item["id"]), "unit": ""}
                    for item in j[1]
                    if isinstance(item, dict) and item.get("id")
                }, {}
            return {}, {}
        except Exception as e:
            print(f"[WB] Catalog error: {e}")
            self.offline = True
            return {}, {}

    def get_indicator(self, indicator_code):
        if self.offline:
            return []

        try:
            r = self.session.get(
                f"{self.base_url}/country/all/indicator/{indicator_code}?format=json&per_page=20000",
                timeout=self.timeout,
                headers=self.headers,
            )
            j = r.json()
            return j[1] if isinstance(j, list) and len(j) > 1 else []
        except Exception as e:
            print(f"[WB] Indicator error ({indicator_code}): {e}")
            self.offline = True
            return []


# ============================================================
# WHO GHO ODATA CLIENT
# ============================================================
class WHOClient:
    """
    WHO GHO OData API.

    We use:
      - /Indicator for list of indicators
      - /DIMENSION/COUNTRY/DimensionValues to map SpatialDim code -> country name
      - /{IndicatorCode} for the actual data rows
    """
    SOURCE_TYPE = "WHO_GHO"

    def __init__(self):
        self.base_url = "https://ghoapi.azureedge.net/api"
        self.session = _session_no_retries()
        self.headers = {"User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        self.timeout = HARD_TIMEOUT
        self.offline = False
        self._country_catalog = None

    def _get_json_value_list(self, url):
        """
        WHO returns OData JSON:
          { "value": [...], "@odata.nextLink": "..." }
        We follow nextLink to collect all pages (still one-shot per page).
        """
        out = []
        next_url = url

        while next_url:
            r = self.session.get(next_url, timeout=self.timeout, headers=self.headers)
            if r is None or r.status_code >= 400:
                code = r.status_code if r is not None else "NO_RESPONSE"
                raise RuntimeError(f"HTTP {code} for {next_url}")

            j = r.json()
            if not isinstance(j, dict):
                break

            page = j.get("value", [])
            if isinstance(page, list):
                out.extend(page)

            next_url = j.get("@odata.nextLink")

        return out

    def get_country_catalog(self):
        if self._country_catalog is not None:
            return self._country_catalog

        url = f"{self.base_url}/DIMENSION/COUNTRY/DimensionValues"
        rows = self._get_json_value_list(url)

        country_map = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            code = row.get("Code")
            title = row.get("Title")
            if code and title:
                country_map[str(code).strip()] = str(title).strip()

        self._country_catalog = country_map
        return country_map

    def get_catalog(self):
        if self.offline:
            return {}, {}

        try:
            url = f"{self.base_url}/Indicator"
            rows = self._get_json_value_list(url)

            indicators = {}
            for row in rows:
                if not isinstance(row, dict):
                    continue
                code = row.get("IndicatorCode")
                name = row.get("IndicatorName")
                if code:
                    indicators[str(code)] = {"label": str(name) if name else str(code), "unit": ""}

            countries = self.get_country_catalog()

            if not indicators:
                print("[WHO] Indicator catalog empty — marking WHO OFFLINE for this run.")
                self.offline = True
                return {}, {}

            return indicators, countries

        except Exception as e:
            print(f"[WHO] Catalog error (fast-fail): {e}")
            self.offline = True
            return {}, {}

    def get_indicator(self, indicator_code):
        if self.offline:
            return []

        try:
            url = f"{self.base_url}/{indicator_code}"
            rows = self._get_json_value_list(url)
            return rows if isinstance(rows, list) else []
        except Exception as e:
            print(f"[WHO] Indicator error ({indicator_code}) fast-fail: {e}")
            self.offline = True
            return []


# ============================================================
# OECD CLIENT (LEAVE SIMPLE)
# ============================================================
class OECDClient:
    SOURCE_TYPE = "OECD_CSV"

    def __init__(self):
        self.session = _session_no_retries()
        self.headers = {"User-Agent": "Mozilla/5.0"}
        self.timeout = HARD_TIMEOUT
        self.offline = False

        self.csv_url = (
            "https://stats.oecd.org/sdmx-json/data/DP_LIVE/"
            ".GDP.../OECD?contentType=csv&detail=code&separator=comma&csv-lang=en"
        )

    def get_catalog(self):
        if self.offline:
            return {}, {}
        return {"OECD_GDP": {"label": "[OECD] GDP (DP_LIVE)", "unit": ""}}, {}

    def get_indicator(self, indicator_code):
        if self.offline:
            return ""

        try:
            r = self.session.get(self.csv_url, timeout=self.timeout, headers=self.headers)
            if r is None or r.status_code >= 400:
                code = r.status_code if r is not None else "NO_RESPONSE"
                print(f"[OECD] CSV error ({indicator_code}): HTTP {code} — marking OECD OFFLINE.")
                self.offline = True
                return ""
            return r.text

        except Exception as e:
            print(f"[OECD] CSV error ({indicator_code}): {e}")
            self.offline = True
            return ""
