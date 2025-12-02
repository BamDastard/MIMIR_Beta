import React, { Suspense, forwardRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import MimirAvatar, { MimirAvatarRef } from './MimirAvatar';

const CameraRig = () => {
    const { camera } = useThree();
    useFrame(() => {
        // Force camera to look at the head position
        camera.lookAt(0, 1.65, 0);
    });
    return null;
};

const AvatarScene = forwardRef<MimirAvatarRef, {}>((props, ref) => {
    return (
        <Canvas
            camera={{ position: [0, 1.8, 2.5], fov: 45 }}
            gl={{ alpha: true, antialias: true }}
            className="w-full h-full"
        >
            <ambientLight intensity={0.6} />
            <spotLight position={[0, 2, 5]} angle={0.5} penumbra={1} intensity={1} />
            <pointLight position={[-5, 2, -5]} intensity={0.5} />

            <Suspense fallback={null}>
                <MimirAvatar ref={ref} />
                <Environment preset="city" />
                <CameraRig />
            </Suspense>
        </Canvas>
    );
});

export default AvatarScene;
