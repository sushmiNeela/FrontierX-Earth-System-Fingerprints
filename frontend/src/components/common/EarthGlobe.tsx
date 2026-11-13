import { useEffect, useRef } from "react";

import {
  Viewer,
  UrlTemplateImageryProvider,
  Cartesian2,
  Cartesian3,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Color,
  Ion,
  CallbackPositionProperty,
  JulianDate,
  SceneMode,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./EarthGlobe.css";

type RegionKey = "bangladesh" | "igp" | "amazon";

type RegionLocation = {
  id: RegionKey;
  name: string;
  longitude: number;
  latitude: number;
  color: Color;
};

export default function EarthGlobe({
  focusRegion,
  onRegionSelect,
}: {
  focusRegion?: RegionKey;
  onRegionSelect?: (region: RegionKey) => void;
}) {
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

    const satelliteLayer = new UrlTemplateImageryProvider({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      credit:
        "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    });

    viewer.imageryLayers.addImageryProvider(satelliteLayer);

    const locations: RegionLocation[] = [
      {
        id: "bangladesh",
        name: "Bangladesh",
        longitude: 90.3,
        latitude: 23.7,
        color: Color.fromCssColorString("#55e6c1"),
      },
      {
        id: "igp",
        name: "Indo-Gangetic Plain",
        longitude: 82,
        latitude: 27,
        color: Color.fromCssColorString("#66aaff"),
      },
      {
        id: "amazon",
        name: "Amazon Frontier",
        longitude: -60,
        latitude: -5,
        color: Color.fromCssColorString("#f2bd67"),
      },
    ];

    const selectedLocation = locations.find(
      (location) => location.id === focusRegion,
    );

    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(
        selectedLocation?.longitude ?? 20,
        selectedLocation?.latitude ?? 15,
        selectedLocation ? 5200000 : 22000000,
      ),
    });

    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }

    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.backgroundColor =
      Color.fromCssColorString("#050b16");

    locations.forEach((location) => {
      const isSelected = location.id === focusRegion;

      viewer.entities.add({
        id: `region-${location.id}`,
        name: location.name,
        position: Cartesian3.fromDegrees(
          location.longitude,
          location.latitude,
        ),
        point: {
          pixelSize: isSelected ? 15 : 9,
          color: location.color,
          outlineColor: Color.WHITE,
          outlineWidth: isSelected ? 3 : 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: location.name,
          font: isSelected ? "bold 14px Inter" : "12px Inter",
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: 2,
          pixelOffset: new Cartesian3(0, -22, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    });

    const clickHandler = onRegionSelect
      ? new ScreenSpaceEventHandler(viewer.scene.canvas)
      : undefined;

    clickHandler?.setInputAction((movement: { position: Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position);
      const pickedEntity = picked?.id;

      const clickedRegion = locations.find(
        (location) => pickedEntity?.id === `region-${location.id}`,
      );

      if (clickedRegion) {
        onRegionSelect?.(clickedRegion.id);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    // Keep the illustrative Moon system on the global Explorer only.
    if (!focusRegion) {
      const moonOrbitRadius = 11000000;
      const orbitInclination = 0.25;
      const orbitPositions: Cartesian3[] = [];

      for (let i = 0; i <= 180; i++) {
        const angle = (i / 180) * Math.PI * 2;

        orbitPositions.push(
          new Cartesian3(
            moonOrbitRadius * Math.cos(angle),
            moonOrbitRadius *
              Math.sin(angle) *
              Math.cos(orbitInclination),
            moonOrbitRadius *
              Math.sin(angle) *
              Math.sin(orbitInclination),
          ),
        );
      }

      viewer.entities.add({
        name: "Illustrative Moon Orbit",
        polyline: {
          positions: orbitPositions,
          width: 2,
          material: Color.fromCssColorString("#dce8ff").withAlpha(0.65),
        },
      });

      const orbitStartTime = JulianDate.now();

      const moonPosition = new CallbackPositionProperty(
        (time) => {
          if (!time) return Cartesian3.ZERO;

          const elapsed = JulianDate.secondsDifference(
            time,
            orbitStartTime,
          );

          const angle = elapsed * 0.000035;

          return new Cartesian3(
            moonOrbitRadius * Math.cos(angle),
            moonOrbitRadius *
              Math.sin(angle) *
              Math.cos(orbitInclination),
            moonOrbitRadius *
              Math.sin(angle) *
              Math.sin(orbitInclination),
          );
        },
        false,
      );

      viewer.entities.add({
        name: "Illustrative Moon",
        position: moonPosition,
        point: {
          pixelSize: 15,
          color: Color.WHITE,
          outlineColor: Color.fromCssColorString("#a9c7ff"),
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: "MOON",
          font: "bold 12px Inter",
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 3,
          style: 2,
          pixelOffset: new Cartesian3(0, -22, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }

    viewer.clock.shouldAnimate = !focusRegion;
    viewer.clock.multiplier = 60;

    const removeEarthRotation =
      viewer.scene.preRender.addEventListener(() => {
        if (
          !focusRegion &&
          viewer.scene.mode === SceneMode.SCENE3D
        ) {
          viewer.camera.rotate(Cartesian3.UNIT_Z, 0.00008);
        }
      });

    return () => {
      removeEarthRotation();
      clickHandler?.destroy();
      viewer.destroy();
    };
  }, [focusRegion, onRegionSelect]);

  return (
    <div
      ref={containerRef}
      className="earth-globe-container"
    />
  );
}