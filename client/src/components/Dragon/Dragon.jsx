import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import styles from './Dragon.module.css';

function DragonModel() {
  const groupRef = useRef();
  const { scene, animations } = useGLTF('/models/dragon.glb');
  const { actions, mixer } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (groupRef.current) {
      // Keep the same rotation
      groupRef.current.rotation.x = Math.PI / 2.2;
      groupRef.current.rotation.y = Math.PI;
      groupRef.current.rotation.z = Math.PI / 12;
    }

    // Play model animations if any
    if (animations && animations.length > 0) {
      Object.values(actions).forEach(action => {
        action.play();
        action.setLoop(THREE.LoopRepeat);  // Ensure continuous animation
        action.timeScale = 1;            // Slightly slower animation speed
      });
    }
  }, [actions, animations]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      mixer?.update(clock.getDelta());
      
      // Lowered Y position and adjusted other coordinates
      groupRef.current.position.set(-2, -4, -7); // Changed Y from -2 to -4
      
      // Keep same rotation
      groupRef.current.rotation.x = Math.PI;
      groupRef.current.rotation.y = 350;
      groupRef.current.rotation.z = Math.PI;

      // Reduced breathing amplitude for lower position
      const breathe = Math.sin(clock.getElapsedTime() * 2) * 0.03; // Reduced from 0.05
      groupRef.current.position.y += breathe;
    }
  });

  return (
    <primitive
      ref={groupRef}
      object={scene}
      scale={0.025}
      castShadow
      receiveShadow
    />
  );
}

function Dashboard() {
  return (
    <div className={`${styles.container} ${styles.starryBackground}`}>
      <Canvas 
        shadows
        camera={{ 
          position: [-40, 35, 70], // Adjusted for better static viewing angle
          fov: 40,                 // Narrower FOV for more focused view
          near: 1,
          far: 1000
        }}
        gl={{ 
          antialias: true,
          alpha: true,
          physicallyCorrectLights: true,
          shadowMap: {
            type: THREE.PCFSoftShadowMap
          }
        }}
      >
        <fog attach="fog" args={['#000', 35, 100]} /> {/* Pushed fog back slightly */}
        
        {/* Enhanced lighting setup */}
        <ambientLight intensity={4} /> {/* Increased from 0.2 */}
        
        {/* Main directional light */}
        <directionalLight 
          intensity={1.5}          // Increased from 1.0
          position={[10, 15, 10]}   // Adjusted for better dragon illumination
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-near={1}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />

        {/* Added spotlight focused on dragon */}
        <spotLight
          intensity={1}
          position={[-10, 15, -5]}
          angle={0.4}
          penumbra={0.5}
          castShadow
          color="#ffffff"
        />

        {/* Added rim light for better definition */}
        <pointLight
          intensity={2}
          position={[10, 10, -10]}
          color="#ffffff"
        />

        <Suspense fallback={null}>
          <DragonModel />
          <Environment 
            preset="sunset"
            intensity={0.3} // Reduced environment intensity
          />
        </Suspense>
        
        <OrbitControls 
          enabled={false}          // Disable all camera controls
          enableZoom={false}       // Disable zoom
          enablePan={false}        // Disable panning
          enableRotate={false}     // Disable rotation
          target={[0, 8, 0]}      // Fixed look-at point
        />
      </Canvas>
    </div>
  );
}

// Preload the model
useGLTF.preload('/models/dragon.glb');
export default Dashboard;
