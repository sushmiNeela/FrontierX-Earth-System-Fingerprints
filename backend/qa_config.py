
import numpy as np


# ============================================================
# NASA MODIS / SMAP QA CONFIGURATION
# Common analysis period: 2018-01-01 to 2025-12-31
# ============================================================


def _check_same_shape(data, qa, variable):
    if np.shape(data) != np.shape(qa):
        raise ValueError(
            f"{variable}: data shape {np.shape(data)} "
            f"does not match QA shape {np.shape(qa)}"
        )


# ============================================================
# 1. MODIS LST — MOD11A1.061
# QA layer: QC_Day
# ============================================================

def lst_qc_mask(qc_day):

    qc = np.asarray(qc_day)

    modland = qc & 0b11
    data_quality = (qc >> 2) & 0b11
    emissivity_error = (qc >> 4) & 0b11
    lst_error = (qc >> 6) & 0b11

    return (
        (modland == 0)
        & (data_quality == 0)
        & (emissivity_error <= 2)
        & (lst_error <= 1)
    )


def lst_data_valid_mask(lst_raw):

    data = np.asarray(lst_raw)

    return (
        np.isfinite(data)
        & (data >= 7500)
        & (data <= 65535)
    )


def final_lst_mask(lst_raw, qc_day):

    _check_same_shape(lst_raw, qc_day, "LST")

    return (
        lst_data_valid_mask(lst_raw)
        & lst_qc_mask(qc_day)
    )


# ============================================================
# 2. MODIS NDVI — MOD13Q1.061
# QA layer: _250m_16_days_VI_Quality
# ============================================================

def ndvi_qc_mask(vi_quality):

    qa = np.asarray(vi_quality)

    modland = qa & 0b11
    usefulness = (qa >> 2) & 0b1111
    aerosol = (qa >> 6) & 0b11
    adjacent_cloud = (qa >> 8) & 0b1
    mixed_clouds = (qa >> 10) & 0b1
    land_water = (qa >> 11) & 0b111
    possible_snow = (qa >> 14) & 0b1
    possible_shadow = (qa >> 15) & 0b1

    return (
        (modland == 0)
        & (usefulness <= 1)
        & (aerosol <= 2)
        & (adjacent_cloud == 0)
        & (mixed_clouds == 0)
        & (land_water == 1)
        & (possible_snow == 0)
        & (possible_shadow == 0)
    )


def ndvi_data_valid_mask(ndvi_raw):

    data = np.asarray(ndvi_raw)

    return (
        np.isfinite(data)
        & (data >= -2000)
        & (data <= 10000)
        & (data != -3000)
    )


def final_ndvi_mask(ndvi_raw, vi_quality):

    _check_same_shape(ndvi_raw, vi_quality, "NDVI")

    return (
        ndvi_data_valid_mask(ndvi_raw)
        & ndvi_qc_mask(vi_quality)
    )


# ============================================================
# 3. SMAP SOIL MOISTURE — SPL3SMP_E.006
# DCA QA layer:
# Soil_Moisture_Retrieval_Data_AM_retrieval_qual_flag_dca
# ============================================================

def sm_dca_qc_mask(retrieval_qual_flag_dca):

    qa = np.asarray(retrieval_qual_flag_dca)

    recommended_quality = qa & 0b1
    retrieval_attempted = (qa >> 1) & 0b1
    retrieval_successful = (qa >> 2) & 0b1

    return (
        (recommended_quality == 0)
        & (retrieval_attempted == 0)
        & (retrieval_successful == 0)
    )


def sm_freeze_thaw_success(retrieval_qual_flag_dca):

    qa = np.asarray(retrieval_qual_flag_dca)

    return ((qa >> 3) & 0b1) == 0


def sm_data_valid_mask(sm_raw):

    data = np.asarray(sm_raw)

    return (
        np.isfinite(data)
        & (data >= 0.02)
        & (data <= 0.5)
    )


def final_sm_dca_mask(sm_raw, retrieval_qual_flag_dca):

    _check_same_shape(
        sm_raw,
        retrieval_qual_flag_dca,
        "Soil Moisture"
    )

    return (
        sm_data_valid_mask(sm_raw)
        & sm_dca_qc_mask(retrieval_qual_flag_dca)
    )


# ============================================================
# 4. SCALE FACTORS
# ============================================================

LST_SCALE = 0.02
NDVI_SCALE = 0.0001

def convert_lst_to_kelvin(lst_raw):
    return np.asarray(lst_raw, dtype=np.float32) * LST_SCALE


def convert_ndvi_to_physical(ndvi_raw):
    return np.asarray(ndvi_raw, dtype=np.float32) * NDVI_SCALE


# ============================================================
# END OF QA CONFIGURATION
# ============================================================
