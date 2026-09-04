import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Same sense as Scene.jsx's fixed camera: a unit vector pointing FROM the
// target TOWARD the camera, so the graphic side of a deck stays visible
// (see Scene.jsx's comment on why Y has to be negative here).
const VIEW_DIR = new THREE.Vector3(-260, -420, 480).normalize();

/**
 * Capture-only (see Pages/Dev/ThumbnailCapture.jsx): reframes the camera to
 * tightly fit whatever meshes are CURRENTLY VISIBLE, along the same viewing
 * direction Scene.jsx's fixed camera already uses. Not used by /customize or
 * the Home hero — Scene.jsx skips mounting OrbitControls entirely when this
 * is active (see below) so nothing fights the camera position this sets.
 *
 * A skateboard deck is long and thin, not sphere-ish — sizing distance off
 * the bounding box's 3D diagonal (as a first pass here did) way overshoots,
 * because a diagonal treats the object as if it needed clearance in every
 * direction at once. What actually matters is the extent PERPENDICULAR to
 * the view direction, i.e. how big the object looks projected onto the
 * camera's own image plane — so this projects the box corners onto the
 * view's right/up axes and fits distance to that instead.
 *
 * `focusName` (optional, EXACT object name): wheels.glb's 18 options are
 * each TWO disconnected axle groups — `<key>1`/`<key>2`, front and rear,
 * spread out by the board's real wheelbase since they sit at their actual
 * mounted positions (see Wheels.jsx). Fitting the whole visible scene for
 * one gives a wide, mostly-empty shot of two small clusters in opposite
 * corners; passing `${meshName}1` fits tightly to just that named group's
 * OWN subtree instead (found via `getObjectByName`, then only meshes under
 * it — the group name itself lives one level up from the actual mesh
 * nodes, so a plain name-substring match on every mesh would find nothing).
 * This is what Pages/Dev/ThumbnailCapture does for type=wheels. Left unset
 * for decks — a deck + its always-on trucks/bolts is already a single
 * well-isolated visible group.
 */
export default function AutoFitCamera({ margin = 1.15, focusName = null }) {
    const { camera, scene, size } = useThree();

    useEffect(() => {
        const timer = setTimeout(() => {
            const box = new THREE.Box3();
            let found = false;

            const focusObj = focusName ? scene.getObjectByName(focusName) : null;
            const root = focusObj ?? scene;

            root.traverse((child) => {
                if (!child.isMesh || !child.visible) return;
                box.expandByObject(child);
                found = true;
            });

            if (!found) return;

            const center = box.getCenter(new THREE.Vector3());

            const worldUp = new THREE.Vector3(0, 1, 0);
            const right = new THREE.Vector3().crossVectors(VIEW_DIR, worldUp).normalize();
            const up = new THREE.Vector3().crossVectors(right, VIEW_DIR).normalize();

            let halfWidth = 0;
            let halfHeight = 0;
            const corner = new THREE.Vector3();

            for (let i = 0; i < 8; i++) {
                corner.set(
                    i & 1 ? box.max.x : box.min.x,
                    i & 2 ? box.max.y : box.min.y,
                    i & 4 ? box.max.z : box.min.z
                );
                corner.sub(center);
                halfWidth = Math.max(halfWidth, Math.abs(corner.dot(right)));
                halfHeight = Math.max(halfHeight, Math.abs(corner.dot(up)));
            }

            const vFov = (camera.fov * Math.PI) / 180;
            const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / size.height));

            const distanceForHeight = halfHeight / Math.tan(vFov / 2);
            const distanceForWidth = halfWidth / Math.tan(hFov / 2);
            const distance = Math.max(distanceForHeight, distanceForWidth, 1) * margin;

            camera.position.copy(center).addScaledVector(VIEW_DIR, distance);
            camera.near = Math.max(distance - Math.max(halfWidth, halfHeight) * 4, 1);
            camera.far = distance + Math.max(halfWidth, halfHeight) * 4;
            camera.up.copy(up);
            camera.lookAt(center);
            camera.updateProjectionMatrix();
        }, 400);

        return () => clearTimeout(timer);
    }, [camera, scene, size, margin, focusName]);

    return null;
}
