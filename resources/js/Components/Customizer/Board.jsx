import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';

/** Walk .parent up the chain — replaces three core's traverseAncestors,
 * which main.js used but isn't exposed the same way off a cached scene. */
function isDescendantOf(object, ancestor) {
    if (!ancestor) return false;
    for (let node = object.parent; node; node = node.parent) {
        if (node === ancestor) return true;
    }
    return false;
}

/**
 * Loads board.glb once and toggles mesh VISIBILITY to switch decks — this is
 * a faithful translation of reference/skate-demo/main.js's loadModels() +
 * updateConfiguration(), not a reinterpretation. The 14 deck meshes, plus
 * Bolts and Trucks (always-visible hardware), all live inside this one file.
 *
 * `<primitive object={scene} />` mounts the loaded graph exactly once —
 * selection changes never touch JSX, they mutate `.visible` on the already-
 * loaded Object3D instances via the effect below. Swapping decks by
 * unmounting/remounting an 8.6MB scene per click is not how this is done.
 *
 * No module-level useGLTF.preload() here on purpose: Scene.jsx sets the
 * self-hosted Draco decoder path before this component ever mounts, but a
 * preload fired at import time (before Scene.jsx's module body runs) would
 * race that and fall back to the default Google CDN decoder path instead.
 */
export default function Board({ activeMeshName, boltsColor, trucksColor }) {
    const { scene: cachedScene } = useGLTF('/models/board.glb');

    // useGLTF caches the parsed scene by URL, and this component mutates it
    // in place (visibility flags, cloned-then-recoloured materials) — so two
    // independent mounts of <Board> sharing that one cached object (e.g. the
    // Home hero showcase and the /customize picker, both alive in the same
    // SPA session since Inertia never does a full page reload) would fight
    // over the same mesh state. Cloning once per mount gives each its own
    // Object3D graph; the per-mesh material clone below still only clones
    // once per *this* graph; the two boards never touch each other again
    // after this line.
    const scene = useMemo(() => cachedScene.clone(true), [cachedScene]);

    const meshMapRef = useRef(null);
    const coreRef = useRef({ bolts: null, trucks: null });

    // Build the name -> Object3D lookup, and the one-time material tweak,
    // once per loaded scene (useGLTF caches by URL, so this effectively runs
    // once for the page's lifetime, not once per selection).
    useEffect(() => {
        const map = {};

        scene.traverse((child) => {
            const nameLower = child.name.toLowerCase();

            if (child.isMesh) {
                // Clone once — sibling meshes can share a material instance
                // by default, and colouring/roughness one must not bleed
                // into another. Ported from main.js lines ~123-166.
                if (!child.material.__syndicateCloned) {
                    child.material = child.material.clone();
                    child.material.__syndicateCloned = true;

                    const isGrip = /grip|tape|top|sand/.test(nameLower);

                    if (isGrip) {
                        child.material.roughness = 0.95;
                        child.material.metalness = 0.0;
                        if (child.material.clearcoat !== undefined) {
                            child.material.clearcoat = 0.0;
                        }
                    } else {
                        child.material.roughness = 0.15;
                        child.material.metalness = 0.25;
                        if (child.material.clearcoat !== undefined) {
                            child.material.clearcoat = 1.0;
                            child.material.clearcoatRoughness = 0.1;
                        }
                    }
                }
            }

            map[nameLower] = child;

            if (nameLower === 'bolts') coreRef.current.bolts = child;
            if (nameLower === 'trucks') coreRef.current.trucks = child;
        });

        meshMapRef.current = map;
        // Trigger the visibility effect below once the map exists — handled
        // by that effect also depending on `scene`, which is stable here.
    }, [scene]);

    // Toggle visibility on selection change. Direct equivalent of
    // updateConfiguration()'s traverse-and-set-visible block.
    //
    // Each deck group wraps ONE glTF mesh with TWO primitives — griptape
    // (generic, shared material across every deck) and the printed graphic
    // (the actual per-deck texture). Both come back from GLTFLoader as
    // separate Mesh children, so revealing "the deck" always means both;
    // see Scene.jsx for why the camera has to be below the board to
    // actually see the graphic one.
    useEffect(() => {
        if (!meshMapRef.current) return;

        scene.traverse((child) => {
            if (!child.isMesh) return;

            const isCore =
                child === coreRef.current.bolts ||
                child === coreRef.current.trucks ||
                isDescendantOf(child, coreRef.current.bolts) ||
                isDescendantOf(child, coreRef.current.trucks);

            if (!isCore) child.visible = false;
        });

        if (!activeMeshName) return;

        const needle = activeMeshName.toLowerCase();
        const active = Object.entries(meshMapRef.current).find(([name]) =>
            name.includes(needle)
        )?.[1];

        if (active) {
            active.visible = true;
            active.traverse((c) => {
                if (c.isMesh) c.visible = true;
            });
        }
    }, [activeMeshName, scene]);

    // Bolts/Trucks are a live material recolour, not a mesh swap — there is
    // only ever the one physical part, so "picking a colour" means setting
    // .color on its (already-cloned, see above) material directly. Ported
    // from main.js's updateMaterialColor(); metalness/roughness match the
    // reference's isMetallic=true branch so a recolour still reads as
    // hardware, not painted plastic.
    useEffect(() => {
        const applyColor = (mesh, hex) => {
            if (!mesh || !hex) return;

            mesh.traverse((child) => {
                if (!child.isMesh) return;
                child.material.color.set(hex);
                child.material.metalness = 0.95;
                child.material.roughness = 0.15;
            });
        };

        applyColor(coreRef.current.bolts, boltsColor);
        applyColor(coreRef.current.trucks, trucksColor);
    }, [boltsColor, trucksColor, scene]);

    return <primitive object={scene} />;
}
