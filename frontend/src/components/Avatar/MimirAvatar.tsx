import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { TalkingHead } from '@/lib/talkinghead/talkinghead.mjs';
import { LipsyncEn } from '@/lib/talkinghead/lipsync-en.mjs';

export interface MimirAvatarRef {
    addAudio: (audioBase64: string) => void;
    addText: (text: string) => void;
    stop: () => void;
    playAnimation: (name: 'thinking' | 'tool' | 'idle') => void;
    startAudio: () => void;
}

const MimirAvatar = forwardRef<MimirAvatarRef, {}>((props, ref) => {
    const { scene, camera, gl } = useThree();
    const [head, setHead] = useState<any>(null);
    const avatarRef = useRef<any>(null);
    const lipsyncEn = useRef<any>(new LipsyncEn());

    // Internal buffers
    const audioQueue = useRef<string[]>([]);
    const textBuffer = useRef<string>("");
    const isProcessing = useRef<boolean>(false);

    const processQueue = async () => {
        if (isProcessing.current || !head || audioQueue.current.length === 0) return;

        isProcessing.current = true;

        try {
            const audioBase64 = audioQueue.current.shift();
            if (!audioBase64) {
                isProcessing.current = false;
                return;
            }

            // Decode Audio
            const binaryString = window.atob(audioBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBuffer = bytes.buffer;

            const audioContext = head.audioCtx;
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
            const durationMs = decodedAudio.duration * 1000;

            // CONSUME TEXT FROM BUFFER
            let allWords = textBuffer.current.trim().split(/\s+/);
            if (allWords.length === 1 && allWords[0] === "") allWords = [];

            // Calculate how many words fit in this audio chunk based on phoneme duration
            // This is a heuristic: we assume an average speaking rate, but we refine it with phonemes
            // Target: ~4 words per second is a baseline, but we'll trust the phonemes more if we had them for the whole text
            // Since we only have a chunk, we'll stick to a safe max for now to avoid over-consumption
            const targetWords = Math.max(1, Math.ceil(decodedAudio.duration * 4));

            // Take words from the buffer
            const wordsToSpeak = allWords.slice(0, targetWords);

            // Update buffer
            textBuffer.current = allWords.slice(targetWords).join(" ");

            // PHONEME-BASED TIMING & VISEMES
            // We now calculate the exact viseme sequence for the entire text chunk
            // This gives us frame-perfect control and allows us to bypass the library's internal estimation
            const fullText = wordsToSpeak.join(" ");
            const visemeData = lipsyncEn.current.wordsToVisemes(fullText);

            // Calculate total relative duration from phonemes
            const totalRelativeDuration = visemeData.durations.reduce((a: number, b: number) => a + b, 0);

            // Calculate timings
            const words: string[] = [];
            const wtimes: number[] = [];
            const wdurations: number[] = [];

            const visemes: string[] = [];
            const vtimes: number[] = [];
            const vdurations: number[] = [];

            let currentTime = 0;

            // No padding for seamless flow
            const availableDuration = durationMs;

            // Map visemes to actual time
            if (totalRelativeDuration > 0) {
                visemeData.visemes.forEach((viseme: string, i: number) => {
                    const relDur = visemeData.durations[i];
                    const absDur = (relDur / totalRelativeDuration) * availableDuration;

                    visemes.push(viseme);
                    vtimes.push(currentTime);
                    vdurations.push(absDur);

                    currentTime += absDur;
                });
            }

            // Map words (for subtitles/debug) - approximate based on viseme groups if needed, 
            // but for now we just distribute them evenly as they are less critical for the animation itself
            // or we could map them to the viseme times if we had the word boundary info from wordsToVisemes (which we don't easily)
            // So we'll stick to the weight-based distribution for words, which is "good enough" for the internal logic
            let wordTime = 0;
            const wordWeights = wordsToSpeak.map(word => {
                const v = lipsyncEn.current.wordsToVisemes(word);
                return v.durations.reduce((a: number, b: number) => a + b, 0);
            });
            const totalWordWeight = wordWeights.reduce((a, b) => a + b, 0);

            wordsToSpeak.forEach((word, i) => {
                const dur = totalWordWeight > 0
                    ? (wordWeights[i] / totalWordWeight) * availableDuration
                    : availableDuration / wordsToSpeak.length;
                words.push(word);
                wtimes.push(wordTime);
                wdurations.push(dur);
                wordTime += dur;
            });

            // Speak
            if (head.speakAudio) {
                // Ensure we stop "thinking" animation before speaking so it doesn't get stuck
                if (head.mixer) {
                    head.mixer.stopAllAction();
                }

                await new Promise((resolve) => {
                    head.speakAudio({
                        audio: decodedAudio,
                        words: words,
                        wtimes: wtimes,
                        wdurations: wdurations,
                        visemes: visemes,
                        vtimes: vtimes,
                        vdurations: vdurations,
                        wpm: 0,
                        lipsyncLang: 'en'
                    });

                    // Poll for completion
                    const checkSpeaking = setInterval(() => {
                        if (!head.isSpeaking) {
                            clearInterval(checkSpeaking);
                            resolve(true);
                        }
                    }, 50);
                });
            }

        } catch (error) {
            console.error("Error processing avatar queue:", error);
        } finally {
            isProcessing.current = false;
            // Trigger next chunk if available
            processQueue();
        }
    };

    useImperativeHandle(ref, () => ({
        addAudio: (audioBase64: string) => {
            audioQueue.current.push(audioBase64);
            processQueue();
        },
        addText: (text: string) => {
            textBuffer.current += (textBuffer.current ? " " : "") + text;
            // We don't trigger processQueue here; audio arrival triggers it.
        },
        stop: () => {
            if (head && head.stopSpeaking) {
                head.stopSpeaking();
            }
            audioQueue.current = [];
            textBuffer.current = "";
            isProcessing.current = false;
        },
        playAnimation: async (name: 'thinking' | 'tool' | 'idle') => {
            if (!head) return;

            try {
                if (name === 'idle') {
                    if (head.mixer) {
                        head.mixer.stopAllAction();
                    }
                } else {
                    const url = name === 'thinking' ? '/animations/thinking.fbx' : '/animations/tool.fbx';
                    await head.playAnimation(url, null, 1000, 0, 0.01);
                }
            } catch (e) {
                console.warn(`Failed to play animation ${name}:`, e);
            }
        },
        startAudio: async () => {
            if (head && head.audioCtx && head.audioCtx.state === 'suspended') {
                console.log("Resuming AudioContext via user gesture...");
                await head.audioCtx.resume();
            }
        }
    }));

    useEffect(() => {
        let node: any = null;
        let active = true;

        const initAvatar = async () => {
            try {
                // Aggressive Cleanup
                const objectsToRemove: any[] = [];
                scene.traverse((child) => {
                    if (child.name === 'Armature' || child.name === 'Scene' || child.name === 'AuxScene') {
                        objectsToRemove.push(child);
                    }
                });
                objectsToRemove.forEach((child) => {
                    scene.remove(child);
                });

                // Initialize TalkingHead
                node = new TalkingHead(null as any, {
                    avatarOnly: true,
                    avatarOnlyScene: scene,
                    avatarOnlyCamera: camera,
                    renderer: gl,
                    lipsyncModules: ["en"],
                    lipsyncLang: 'en'
                });

                const avatarConfig = {
                    url: "https://models.readyplayer.me/692e0298134036151dd16bac.glb?morphTargets=ARKit&textureAtlas=1024",
                    body: 'M',
                    avatarMood: 'neutral'
                };

                await node.showAvatar(avatarConfig);

                if (!active) {
                    if (node.armature) scene.remove(node.armature);
                    return;
                }

                // Map Visemes to ARKit Blend Shapes
                // TUNED MAPPINGS: Values adjusted for natural realism (not too subtle, not too exaggerated)
                if (node.morphs && node.addMixedMorphTarget) {
                    const mappings = {
                        // Vowels
                        'viseme_aa': { jawOpen: 0.3, mouthFunnel: 0.1 }, // "Ah" - Subtle open
                        'viseme_E': { jawOpen: 0.2, mouthLowerDownLeft: 0.2, mouthLowerDownRight: 0.2, mouthSmile_L: 0.1, mouthSmile_R: 0.1 }, // "Eh"
                        'viseme_I': { jawOpen: 0.1, mouthSmile_L: 0.4, mouthSmile_R: 0.4, mouthStretch_L: 0.3, mouthStretch_R: 0.3 }, // "Ee" - Gentle smile
                        'viseme_O': { mouthFunnel: 0.5, jawOpen: 0.2, mouthPucker: 0.3 }, // "Oh" - Soft round
                        'viseme_U': { mouthPucker: 0.6, jawOpen: 0.1, mouthFunnel: 0.1 }, // "Oo" - Soft pucker

                        // Consonants
                        'viseme_PP': { mouthPucker: 0.2, mouthPress_L: 0.4, mouthPress_R: 0.4, jawOpen: 0 }, // "P/B/M"
                        'viseme_SS': { jawOpen: 0.1, mouthSmile_L: 0.2, mouthSmile_R: 0.2, mouthLowerDownLeft: 0.1, mouthLowerDownRight: 0.1 }, // "S/Z"
                        'viseme_DD': { jawOpen: 0.1, mouthFunnel: 0.1, mouthLowerDownLeft: 0.1, mouthLowerDownRight: 0.1 }, // "D/T"
                        'viseme_FF': { jawOpen: 0.1, mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4 }, // "F/V"
                        'viseme_kk': { jawOpen: 0.3, mouthSmile_L: 0.1, mouthSmile_R: 0.1 }, // "K/G"
                        'viseme_nn': { jawOpen: 0.1, mouthSmile_L: 0.1, mouthSmile_R: 0.1 }, // "N/NG"
                        'viseme_RR': { mouthPucker: 0.4, jawOpen: 0.1, mouthFunnel: 0.1 }, // "R"
                        'viseme_sil': { jawOpen: 0, mouthPucker: 0, mouthFunnel: 0 } // Silence
                    };

                    Object.entries(mappings).forEach(([viseme, source]) => {
                        node.addMixedMorphTarget(node.morphs, viseme, source);
                        if (node.mtAvatar && !node.mtAvatar.hasOwnProperty(viseme)) {
                            node.mtAvatar[viseme] = {
                                fixed: null, realtime: null, system: null, systemd: null, newvalue: null, ref: null,
                                min: 0, max: 1,
                                easing: null, base: null, v: 0, needsUpdate: true,
                                acc: 0.5 / 1000, maxv: 0.5 / 1000,
                                limit: null, onchange: null,
                                baseline: 0,
                                ms: [], is: []
                            };
                            node.mtAvatar[viseme].value = 0;
                            node.mtAvatar[viseme].applied = 0;
                            node.morphs.forEach((y: any) => {
                                const ndx = y.morphTargetDictionary[viseme];
                                if (ndx !== undefined) {
                                    node.mtAvatar[viseme].ms.push(y.morphTargetInfluences);
                                    node.mtAvatar[viseme].is.push(ndx);
                                    y.morphTargetInfluences[ndx] = 0;
                                }
                            });
                        }
                    });
                }

                setHead(node);
                avatarRef.current = node;

            } catch (error) {
                console.error("Failed to load avatar:", error);
            }
        };

        initAvatar();

        return () => {
            active = false;
            if (node) {
                try {
                    node.stop();
                    if (node.armature) scene.remove(node.armature);
                } catch (e) {
                    console.error("Error cleaning up avatar:", e);
                }
            }
        };
    }, [scene, camera, gl]);

    useFrame((state, delta) => {
        if (head) {
            head.animate(delta * 1000);
        }
    });

    return null;
});

export default MimirAvatar;
