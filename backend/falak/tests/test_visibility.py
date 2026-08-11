import datetime
import math

import pytest

from falak.astronomy import _horizon, lunar, visibility
from falak.astronomy.timescale import julian_day


def test_syawal_1445h_jakarta_matches_reported_kemenag_figures():
    """
    Eve of 1 Syawal 1445H (2024-04-10), observed 2024-04-09 sunset, Jakarta.
    Publicly reported Kemenag hisab figures for that evening put Moon
    altitude around 6-8 deg and elongation around 8-10 deg across
    Indonesian cities - both criteria were met and Idul Fitri was declared
    for 2024-04-10.
    """
    obs = visibility.compute_hilal_observation(datetime.date(2024, 4, 9), -6.2, 106.8)

    assert 5.0 < obs.moon_altitude_deg < 9.0
    assert 7.0 < obs.elongation_deg < 11.0
    assert obs.moon_age_hours > 0
    assert 0 < obs.illumination_fraction < 0.05

    assert visibility.wujudul_hilal(obs.moonset_time, obs.sunset_time, obs.conjunction_time) is True
    assert visibility.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg) is True


def test_syawal_1445h_jakarta_odeh_is_marginal():
    """
    Odeh's classification for the same evening, kept separate from the test
    above on purpose: Kemenag does not use Odeh, so this is not a check against
    a reported figure and should not be read as one.

    This expectation changed when moon altitude became topocentric. At the
    geocentric altitude the engine used previously (7.00 deg) Odeh's v-value
    cleared 2.0 and classified as visible_optical_aid; at the topocentric
    altitude the criterion is actually defined against (6.00 deg) it lands at
    ~1.1 and classifies as marginal.

    The Kemenag-anchored assertions above were unaffected by that change -
    6.00 deg still sits inside the 6-8 deg band reported across Indonesian
    cities, and MABIMS/wujudul are still met - which is the main evidence that
    the parallax correction moved the engine toward the reference rather than
    away from it.
    """
    obs = visibility.compute_hilal_observation(datetime.date(2024, 4, 9), -6.2, 106.8)
    assert (
        visibility.odeh_criterion(obs.moon_altitude_deg, obs.elongation_deg, obs.crescent_width_arcmin)
        == "marginal"
    )


def test_conjunction_day_itself_is_not_visible():
    """On the evening of conjunction day, the Moon is far too close to the Sun."""
    obs = visibility.compute_hilal_observation(datetime.date(2024, 3, 10), -6.2, 106.8)
    assert visibility.mabims_2021(obs.moon_altitude_deg, obs.elongation_deg) is False


def test_wujudul_hilal_requires_conjunction_before_sunset():
    now = datetime.datetime(2024, 4, 9, 11, 0, 0)
    conj_after_sunset = now + datetime.timedelta(hours=1)
    moonset = now + datetime.timedelta(minutes=30)
    assert visibility.wujudul_hilal(moonset, now, conj_after_sunset) is False


def test_mabims_threshold_boundaries():
    assert visibility.mabims_2021(3.0, 6.4) is True
    assert visibility.mabims_2021(2.99, 6.4) is False
    assert visibility.mabims_2021(3.0, 6.39) is False


def test_moon_altitude_is_topocentric_not_geocentric():
    """
    Regression guard for the correction that made moon altitude topocentric.

    The criteria this engine evaluates - MABIMS 2021's 3 deg floor and Odeh's
    arc of vision - are defined for an observer on the Earth's surface, not at
    its centre. The Moon's horizontal parallax is ~0.95-1.02 deg, so a
    geocentric altitude overstates the observable one by roughly a degree,
    which is an order of magnitude larger than the margins these thresholds get
    decided by. Reverting to geocentric would silently re-inflate every verdict,
    so the difference is asserted directly here rather than left implicit in a
    golden vector.
    """
    date = datetime.date(2024, 4, 9)
    obs = visibility.compute_hilal_observation(date, -6.2, 106.8)

    moon_ra, moon_dec = visibility._moon_ra_dec(obs.sunset_time)
    geocentric = _horizon.altitude_deg(moon_ra, moon_dec, -6.2, 106.8, julian_day(obs.sunset_time))
    parallax = lunar.lunar_position(obs.sunset_time).horizontal_parallax_deg

    assert 0.9 < parallax < 1.05
    # Topocentric sits below geocentric by very nearly the full parallax at
    # these low altitudes, where cos(alt) is close to 1.
    assert obs.moon_altitude_deg < geocentric
    assert geocentric - obs.moon_altitude_deg == pytest.approx(
        parallax * math.cos(math.radians(obs.moon_altitude_deg)), abs=1e-3
    )


def test_moonset_uses_the_moons_own_standard_altitude():
    """
    Moonset must not reuse the Sun's -0.8333 deg horizon constant: that value
    assumes a body with negligible parallax and bakes in the Sun's
    semidiameter. Meeus' h0 for the Moon is 0.7275*pi - 0.5667, which for a
    typical parallax lands slightly ABOVE the astronomical horizon, so the Moon
    sets earlier than the solar constant would predict. Lag time and the
    wujudul hilal verdict both hang off this.
    """
    parallax = 1.0
    h0 = _horizon.moon_standard_altitude_deg(parallax)
    assert h0 == pytest.approx(0.7275 * parallax - 0.5667)
    assert h0 > -0.8333
    assert 0.0 < h0 < 0.3
