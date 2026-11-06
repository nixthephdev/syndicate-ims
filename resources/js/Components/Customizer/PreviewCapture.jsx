import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, Sphere, Vector3 } from 'three';

// Mounted inside the model's Suspense boundary so capture is only enabled
// after the assets and their visibility effects have finished loading.
export default function PreviewCapture({ selectionKey, fitVisible, controlsRef, onCaptureReady }) {
    const { gl, scene, camera, size } = useThree();

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            if (fitVisible) {
                scene.updateMatrixWorld(true);
                const box = new Box3();
                // Box3.setFromObject includes hidden variants. Only measure
                // visible geometry, including visibility inherited from groups.
                scene.traverseVisible((object) => {
                    if (!object.isMesh) return;
                    object.geometry.computeBoundingBox();
                    box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
                });

                if (!box.isEmpty()) {
                    const { center, radius } = box.getBoundingSphere(new Sphere());
                    const controls = controlsRef.current;
                    const direction = camera.position.clone()
                        .sub(controls?.target ?? new Vector3(0, 34, 1)).normalize();
                    const verticalFov = camera.fov * Math.PI / 180;
                    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * size.width / size.height);
                    const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.1;

                    camera.position.copy(center).addScaledVector(direction, distance);
                    camera.near = Math.max(distance - radius * 2, 0.1);
                    camera.far = Math.max(distance + radius * 4, 4000);
                    camera.lookAt(center);
                    camera.updateProjectionMatrix();
                    if (controls) {
                        controls.target.copy(center);
                        controls.minDistance = Math.max(radius * 0.1, 1);
                        controls.update();
                    }
                }
            }

            onCaptureReady?.(() => new Promise((resolve, reject) => {
                // Render immediately before reading: WebGL's default buffer
                // can be cleared between frames, producing an empty download.
                gl.render(scene, camera);
                gl.domElement.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Could not capture the preview.'));
                }, 'image/png');
            }));
        });

        return () => {
            cancelAnimationFrame(frame);
            onCaptureReady?.(null);
        };
    }, [gl, scene, camera, size, selectionKey, fitVisible, controlsRef, onCaptureReady]);

    return null;
}
