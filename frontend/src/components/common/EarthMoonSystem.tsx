
import { useEffect, useRef } from "react";

import {
  Viewer,
  Cartesian3,
  Color,
  Ion,
  JulianDate,
  CallbackPositionProperty,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./EarthGlobe.css";

export default function EarthMoonSystem() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    Ion.defaultAccessToken = "";

    const viewer = new Viewer(containerRef.current, {
      animation: false,
      timeline: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: false,
    });

    const earthRadius = 6371000;
    const moonRadius = 1737400;

    const semiMajorAxis = 384400000;
    const eccentricity = 0.0549;

    const semiMinorAxis =
      semiMajorAxis *
      Math.sqrt(1 - eccentricity * eccentricity);

    viewer.scene.backgroundColor =
      Color.fromCssColorString("#020611");

    viewer.scene.globe.show = false;

    if (viewer.scene.skyBox) {
      viewer.scene.skyBox.show = false;
    }

    // EARTH
    viewer.entities.add({
      name: "Earth",
      position: Cartesian3.ZERO,
      ellipsoid: {
        radii: new Cartesian3(
          earthRadius,
          earthRadius,
          earthRadius
        ),
        material: Color.fromCssColorString("#1769aa"),
        outline: true,
        outlineColor: Color.fromCssColorString("#80cfff"),
      },
      label: {
        text: "EARTH",
        font: "bold 15px sans-serif",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: 2,
        pixelOffset: new Cartesian3(0, -earthRadius - 30, 0),
      },
    });

    // ELLIPTICAL MOON ORBIT
    const orbitPositions: Cartesian3[] = [];

    for (let i = 0; i <= 360; i++) {
      const angle = (i / 360) * Math.PI * 2;

      const radius =
        (semiMajorAxis * (1 - eccentricity * eccentricity)) /
        (1 + eccentricity * Math.cos(angle));

      orbitPositions.push(
        new Cartesian3(
          radius * Math.cos(angle),
          radius * Math.sin(angle),
          0
        )
      );
    }

    viewer.entities.add({
      name: "Moon orbital path",
      polyline: {
        positions: orbitPositions,
        width: 2,
        material: Color.fromCssColorString("#a8c9ff").withAlpha(0.8),
      },
    });

    // SIMPLIFIED KEPLERIAN MOON MOTION
    const startTime = JulianDate.now();

    const orbitalPeriodSeconds =
      27.3217 * 24 * 60 * 60;

    const meanMotion =
      (2 * Math.PI) / orbitalPeriodSeconds;

    const moonPosition = new CallbackPositionProperty(
      (time) => {
        if (!time) {
          return Cartesian3.ZERO;
        }

        const elapsed = JulianDate.secondsDifference(
          time,
          startTime
        );

        const meanAnomaly = meanMotion * elapsed;

        let eccentricAnomaly = meanAnomaly;

        for (let i = 0; i < 8; i++) {
          eccentricAnomaly =
            meanAnomaly +
            eccentricity * Math.sin(eccentricAnomaly);
        }

        const x =
          semiMajorAxis *
          (Math.cos(eccentricAnomaly) - eccentricity);

        const y =
          semiMinorAxis * Math.sin(eccentricAnomaly);

        return new Cartesian3(x, y, 0);
      },
      false
    );

    // MOON
    viewer.entities.add({
      name: "Moon",
      position: moonPosition,
      ellipsoid: {
        radii: new Cartesian3(
          moonRadius,
          moonRadius,
          moonRadius
        ),
        material: Color.fromCssColorString("#c9cbd1"),
        outline: true,
        outlineColor: Color.WHITE,
      },
      label: {
        text: "MOON",
        font: "bold 14px sans-serif",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: 2,
        pixelOffset: new Cartesian3(0, -moonRadius - 30, 0),
      },
    });

    // DISTANCE LABEL
    viewer.entities.add({
      name: "Earth-Moon distance",
      position: new Cartesian3(0, 0, earthRadius * 1.5),
      label: {
        text: "Mean Earth-Moon distance: 384,400 km",
        font: "14px sans-serif",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: 2,
      },
    });

    // CAMERA
    const cameraPosition = new Cartesian3(
      0,
      -semiMajorAxis * 1.8,
      semiMajorAxis * 0.8
    );

    const direction = Cartesian3.normalize(
      Cartesian3.negate(
        cameraPosition,
        new Cartesian3()
      ),
      new Cartesian3()
    );

    const up = Cartesian3.UNIT_Z;

    viewer.camera.setView({
      destination: cameraPosition,
      orientation: {
        direction,
        up,
      },
    });

    // ANIMATION
    viewer.clock.shouldAnimate = true;
    viewer.clock.multiplier = 1200;

    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="earth-globe-container"
    />
  );
}
