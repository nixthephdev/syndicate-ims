// Side-effect import — must run before Board/Wheels mount and call
// useGLTF() for the first time. See utils/dracoLoader.js.
import '@/utils/dracoLoader';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import Board from './Board';
import Wheels from './Wheels';
import { useTheme } from '@/utils/useTheme';

function LoadingFallback() {
    return (
        <Html center>
            <p className="whitespace-nowrap font-display text-xs uppercase tracking-[0.2em] text-white/50 light:text-ink-900/65">
                Loading model…
            </p>
        </Html>
    );
}

/**
 * The 3D viewport. Lighting is ported directly from
 * reference/skate-demo/main.js — already tuned for these baked textures, no
 * reason to redesign it. Directional lights only encode a direction (their
 * position vector's magnitude doesn't matter), so they carry over unscaled
 * even though the model's own scale (below) does not.
 *
 * Camera position/target/OrbitControls distances are NOT arbitrary — the
 * model's real bounding box was measured directly (Box3.setFromObject) via
 * a throwaway diagnostic render: ~119 x 216 x 476 units, centered near
 * (0, 34, 1). That's the original, un-normalized export scale (matches the
 * reference demo's own camera being ~500 units out) — Draco compression
 * changes precision, not scale. A camera at "3 units away" (a reasonable
 * guess before that measurement) sat inside the mesh and rendered nothing.
 *
 * Y is NEGATIVE on purpose. Each deck mesh has two primitives sharing one
 * plane: griptape (top, generic, same material on every deck) and the
 * printed graphic (bottom, the actual per-deck texture — confirmed by
 * inspecting the glTF materials directly). A camera above the board shows
 * only griptape, identical regardless of which deck is selected — which is
 * exactly the "nothing visibly changes" bug this positioning fixes. The
 * reference demo's own hardcoded board-selection camera target
 * (`Vector3(-18.3, -509.0, -21.9)`) makes the same choice for the same
 * reason: the graphic is what a "pick your deck" UI needs to show.
 *
 * Deliberately does NOT replicate the reference's per-selection camera
 * fly-to animation (hardcoded Vector3 positions hand-tuned by orbiting the
 * *original uncompressed* model in a viewer and copying the transform —
 * not derived from the mesh, not portable to a re-export). OrbitControls
 * alone satisfies "360° rotate + zoom" honestly.
 */
const MODEL_CENTER = [0, 34, 1];

export default function Scene({
    deckMeshName,
    wheelsMeshName,
    boltsColor,
    trucksColor,
    transparentBackground = false,
    autoRotate = false,
    enableZoom = true,
    enablePan = true,
    accentColor = null,
}) {
    // <color> sets a raw Three.js scene background — outside Tailwind's
    // reach entirely, so the theme has to be read directly here rather than
    // via a `light:` class. See utils/useTheme.js for why this needs the
    // hook (not just localStorage read once) — it has to follow the toggle
    // if flipped while this page is already mounted. Skipped entirely when
    // `transparentBackground` is set (the Home hero showcase, which sits on
    // the section's own background rather than a boxed-in canvas panel) —
    // Canvas defaults to a transparent GL context when no background color
    // is attached.
    const { theme } = useTheme();

    return (
        <Canvas
            camera={{ position: [-260, -420, 480], fov: 45, near: 1, far: 4000 }}
            dpr={[1, 2]}
            gl={{ alpha: transparentBackground }}
        >
            {!transparentBackground && (
                <color attach="background" args={[theme === 'light' ? '#f7f6f2' : '#0b0b0b']} />
            )}

            <ambientLight intensity={1.0} />
            <directionalLight position={[5, 10, 5]} intensity={2.0} />
            <directionalLight position={[-5, 0, -5]} intensity={1.0} />
            <directionalLight position={[0, -5, 0]} intensity={1.0} />

            {/* Optional brand-colour rim light — decorative showcases only
                (see HeroBoard.jsx). Kept out of the customizer's own render by
                default so it never skews how a shopper actually judges a
                deck's real colour before buying it. */}
            {accentColor && (
                <pointLight color={accentColor} position={[-200, -300, 350]} intensity={4} distance={1200} />
            )}

            <Suspense fallback={<LoadingFallback />}>
                <Board activeMeshName={deckMeshName} boltsColor={boltsColor} trucksColor={trucksColor} />
                <Wheels activeMeshName={wheelsMeshName} />
            </Suspense>

            <OrbitControls
                target={MODEL_CENTER}
                enableDamping
                dampingFactor={0.05}
                minDistance={150}
                maxDistance={2000}
                enableZoom={enableZoom}
                enablePan={enablePan}
                autoRotate={autoRotate}
                autoRotateSpeed={2.5}
            />
        </Canvas>
    );
}
