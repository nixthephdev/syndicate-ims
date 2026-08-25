import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Re-centers an object's pivot to its own bounding-box center, so it spins
 * around its middle rather than the origin of whatever container it was
 * modelled in. Pure three.js scene-graph math (Box3 + a wrapping Group +
 * `attach()`, which reparents while preserving world transform) — ported
 * unchanged from reference/skate-demo/main.js's centerPivotAndReturn().
 */
function centerPivotAndReturn(object) {
    if (!object) return null;

    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const pivot = new THREE.Group();
    const parent = object.parent;

    if (!parent) return null;

    parent.worldToLocal(center);
    pivot.position.copy(center);
    parent.add(pivot);
    pivot.attach(object);

    return pivot;
}

const PREFIXES = ['bb', 'eye', 'star'];
const COLORS = ['BLUE', 'GREEN', 'PURPLE', 'RED', 'WHITE', 'YELLOW'];

/**
 * Loads wheels.glb once and toggles visibility across the 18 named wheel
 * pairs (<prefix><COLOR>1 / <prefix><COLOR>2) to switch wheel sets. Same
 * mount-once, mutate-visibility-imperatively pattern as Board.jsx.
 */
export default function Wheels({ activeMeshName }) {
    const { scene } = useGLTF('/models/wheels.glb');
    const groupsRef = useRef(null);

    // Build the 18 re-centered pivot pairs once per loaded scene.
    useEffect(() => {
        const groups = {};

        PREFIXES.forEach((prefix) => {
            COLORS.forEach((color) => {
                const key = `${prefix}${color}`;
                const w1 = scene.getObjectByName(`${key}1`);
                const w2 = scene.getObjectByName(`${key}2`);

                const pivots = [centerPivotAndReturn(w1), centerPivotAndReturn(w2)].filter(
                    Boolean
                );

                if (pivots.length) groups[key] = pivots;
            });
        });

        groupsRef.current = groups;
    }, [scene]);

    // Toggle visibility on selection change. Direct equivalent of
    // updateConfiguration()'s wheelGroups loop.
    useEffect(() => {
        if (!groupsRef.current) return;

        const needle = (activeMeshName ?? '').toLowerCase();

        Object.entries(groupsRef.current).forEach(([key, pivots]) => {
            const visible = key.toLowerCase() === needle;
            pivots.forEach((pivot) => {
                pivot.visible = visible;
            });
        });
    }, [activeMeshName, scene]);

    return <primitive object={scene} />;
}

// No module-level useGLTF.preload() — see the note in Board.jsx. It would
// fire before Scene.jsx sets the self-hosted Draco decoder path.
