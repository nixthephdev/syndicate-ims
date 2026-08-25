import { useGLTF } from '@react-three/drei';

/**
 * Points drei's shared DRACOLoader at our own decoder files instead of its
 * default (Google's CDN, https://www.gstatic.com/draco/...). Self-hosted on
 * purpose: a defense demo or a shopper on a flaky connection shouldn't
 * depend on a third-party CDN being reachable to render a product at all.
 *
 * Files copied from node_modules/three/examples/jsm/libs/draco/ into
 * public/draco/ — see CLAUDE.md for the exact copy command. drei reuses one
 * module-level DRACOLoader across every useGLTF() call once this path is
 * set, so this only needs to run once, before any component that calls
 * useGLTF() actually mounts — importing this module for its side effect is
 * enough, nothing needs to be called at the import site.
 */
useGLTF.setDecoderPath('/draco/');
