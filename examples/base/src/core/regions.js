function clearGroup(group) {
  while (group.children.length) {
    group.remove(group.children[0]);
  }
}

function makeDisc(THREE, { radius, color, opacity, z }) {
  const geometry = new THREE.CircleGeometry(radius, 96);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return mesh;
}

function makeRing(THREE, { innerRadius, outerRadius, color, opacity, z }) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = z;
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return mesh;
}

export function createRegionController({ THREE, zoneGroup }) {
  function build(zoneLayout) {
    clearGroup(zoneGroup);

    const root = zoneLayout.zones.root;
    if (root) {
      zoneGroup.add(
        makeDisc(THREE, {
          radius: root.radius,
          color: root.color,
          opacity: 0.075,
          z: root.z,
        }),
      );
      zoneGroup.add(
        makeDisc(THREE, {
          radius: root.radius * 0.62,
          color: root.accent,
          opacity: 0.04,
          z: root.z + 4,
        }),
      );
    }

    ["character"].forEach((zoneKey) => {
      const zone = zoneLayout.zones[zoneKey];
      if (!zone) {
        return;
      }

      zoneGroup.add(
        makeRing(THREE, {
          innerRadius: zone.innerRadius,
          outerRadius: zone.outerRadius,
          color: zone.color,
          opacity: 0.056,
          z: zone.z,
        }),
      );

      zoneGroup.add(
        makeRing(THREE, {
          innerRadius: zone.innerRadius + 8,
          outerRadius: zone.innerRadius + 12,
          color: zone.accent,
          opacity: 0.08,
          z: zone.z + 4,
        }),
      );

      zoneGroup.add(
        makeRing(THREE, {
          innerRadius: zone.outerRadius - 10,
          outerRadius: zone.outerRadius - 6,
          color: zone.accent,
          opacity: 0.06,
          z: zone.z + 4,
        }),
      );
    });
  }

  return {
    build,
  };
}
