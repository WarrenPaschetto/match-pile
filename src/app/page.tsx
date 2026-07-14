"use client";

import { Canvas } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
    CuboidCollider,
    Physics,
    RigidBody,
} from "@react-three/rapier";
import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { CSSProperties } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import styles from "./page.module.css";

type ShapeType =
    | "box"
    | "sphere"
    | "cone"
    | "cylinder"
    | "torus"
    | "capsule";

type TrayStatus = "idle" | "match" | "wrong";

type GameObject = {
    id: string;
    pairId: string;
    shape: ShapeType;
    color: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
};

type ObjectPieceProps = {
    item: GameObject;
    selected: boolean;
    disabled: boolean;
    onSelect: (item: GameObject) => void;
};

const INITIAL_TIME = 60;

const PAIR_DEFINITIONS: Array<{
    pairId: string;
    shape: ShapeType;
    color: string;
}> = [
    {
        pairId: "orange-box",
        shape: "box",
        color: "#ff7a00",
    },
    {
        pairId: "blue-sphere",
        shape: "sphere",
        color: "#4f8cff",
    },
    {
        pairId: "green-cone",
        shape: "cone",
        color: "#25c76f",
    },
    {
        pairId: "pink-cylinder",
        shape: "cylinder",
        color: "#ff62a8",
    },
    {
        pairId: "purple-torus",
        shape: "torus",
        color: "#9d65ff",
    },
    {
        pairId: "yellow-capsule",
        shape: "capsule",
        color: "#ffd43b",
    },
];

function shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));

        [shuffled[index], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[index],
        ];
    }

    return shuffled;
}

function createGameObjects(): GameObject[] {
    const pairs = PAIR_DEFINITIONS.flatMap((pair) => [
        {
            ...pair,
            id: `${pair.pairId}-a`,
        },
        {
            ...pair,
            id: `${pair.pairId}-b`,
        },
    ]);

    return shuffle(pairs).map((item, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);

        return {
            ...item,
            position: [
                -2.25 +
                    column * 1.5 +
                    (Math.random() - 0.5) * 0.35,
                3.5 + row * 1.25 + Math.random() * 1.2,
                (Math.random() - 0.5) * 1.8,
            ],
            rotation: [
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI,
            ],
            scale: 0.72 + Math.random() * 0.16,
        };
    });
}

function ShapeGeometry({ shape }: { shape: ShapeType }) {
    switch (shape) {
        case "sphere":
            return <sphereGeometry args={[0.72, 32, 32]} />;

        case "cone":
            return <coneGeometry args={[0.72, 1.45, 32]} />;

        case "cylinder":
            return <cylinderGeometry args={[0.64, 0.64, 1.35, 32]} />;

        case "torus":
            return <torusGeometry args={[0.58, 0.25, 20, 40]} />;

        case "capsule":
            return <capsuleGeometry args={[0.48, 0.75, 10, 20]} />;

        default:
            return null;
    }
}

function ObjectPiece({
    item,
    selected,
    disabled,
    onSelect,
}: ObjectPieceProps) {
    const handleClick = (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();

        if (!disabled) {
            onSelect(item);
        }
    };

    const materialColor = selected ? "#ffffff" : item.color;

    return (
        <RigidBody
            position={item.position}
            rotation={item.rotation}
            colliders="hull"
            restitution={0.15}
            friction={0.9}
            linearDamping={0.5}
            angularDamping={0.7}
            canSleep
        >
            {item.shape === "box" ? (
                <RoundedBox
                    args={[1.25, 1.25, 1.25]}
                    radius={0.18}
                    smoothness={5}
                    scale={
                        selected
                            ? item.scale * 1.12
                            : item.scale
                    }
                    onClick={handleClick}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial
                        color={materialColor}
                        roughness={0.34}
                        metalness={0.08}
                        emissive={
                            selected
                                ? item.color
                                : "#000000"
                        }
                        emissiveIntensity={selected ? 0.6 : 0}
                    />
                </RoundedBox>
            ) : (
                <mesh
                    scale={
                        selected
                            ? item.scale * 1.12
                            : item.scale
                    }
                    onClick={handleClick}
                    castShadow
                    receiveShadow
                >
                    <ShapeGeometry shape={item.shape} />

                    <meshStandardMaterial
                        color={materialColor}
                        roughness={0.34}
                        metalness={0.08}
                        emissive={
                            selected
                                ? item.color
                                : "#000000"
                        }
                        emissiveIntensity={selected ? 0.6 : 0}
                    />
                </mesh>
            )}
        </RigidBody>
    );
}

function PhysicsContainer() {
    return (
        <>
            <RigidBody type="fixed" friction={1}>
                <mesh
                    position={[0, -3.25, 0]}
                    receiveShadow
                >
                    <boxGeometry args={[8, 0.5, 5]} />

                    <meshStandardMaterial
                        color="#283747"
                        roughness={0.95}
                    />
                </mesh>
            </RigidBody>

            <RigidBody type="fixed">
                <CuboidCollider
                    args={[0.25, 4, 2.5]}
                    position={[-4, 0, 0]}
                />

                <CuboidCollider
                    args={[0.25, 4, 2.5]}
                    position={[4, 0, 0]}
                />

                <CuboidCollider
                    args={[4, 4, 0.25]}
                    position={[0, 0, -2.5]}
                />

                <CuboidCollider
                    args={[4, 4, 0.25]}
                    position={[0, 0, 2.5]}
                />
            </RigidBody>
        </>
    );
}

type GameSceneProps = {
    objects: GameObject[];
    selectedIds: string[];
    inputLocked: boolean;
    onSelect: (item: GameObject) => void;
};

function GameScene({
    objects,
    selectedIds,
    inputLocked,
    onSelect,
}: GameSceneProps) {
    return (
        <Canvas
            shadows
            camera={{
                position: [0, 1.2, 10.5],
                fov: 46,
            }}
            gl={{
                antialias: true,
                alpha: false,
            }}
        >
            <color attach="background" args={["#17202a"]} />

            <ambientLight intensity={1.5} />

            <directionalLight
                position={[4, 8, 8]}
                intensity={2.5}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />

            <directionalLight
                position={[-5, 1, 4]}
                intensity={0.8}
            />

            <pointLight
                position={[0, 3, 6]}
                intensity={10}
                distance={18}
            />

            <Suspense fallback={null}>
                <Physics gravity={[0, -9.81, 0]}>
                    <PhysicsContainer />

                    {objects.map((item) => (
                        <ObjectPiece
                            key={item.id}
                            item={item}
                            selected={selectedIds.includes(
                                item.id,
                            )}
                            disabled={inputLocked}
                            onSelect={onSelect}
                        />
                    ))}
                </Physics>
            </Suspense>
        </Canvas>
    );
}

function TrayPiece({ item }: { item: GameObject }) {
    const customProperties = {
        "--piece-color": item.color,
    } as CSSProperties;

    return (
        <div className={styles.trayPieceContent}>
            <div
                className={`${styles.trayShape} ${
                    styles[`trayShape_${item.shape}`]
                }`}
                style={customProperties}
            />

            <span>{item.shape}</span>
        </div>
    );
}

type MatchTrayProps = {
    selectedObjects: GameObject[];
    status: TrayStatus;
};

function MatchTray({
    selectedObjects,
    status,
}: MatchTrayProps) {
    const trayStatusClass =
        status === "match"
            ? styles.matchTraySuccess
            : status === "wrong"
              ? styles.matchTrayWrong
              : "";

    return (
        <div
            className={`${styles.matchTray} ${trayStatusClass}`}
        >
            <div className={styles.trayHeader}>
                <span>MATCH TRAY</span>

                <strong>
                    {status === "match"
                        ? "MATCH!"
                        : status === "wrong"
                          ? "TRY AGAIN"
                          : `${selectedObjects.length}/2`}
                </strong>
            </div>

            <div className={styles.traySlots}>
                {[0, 1].map((slotIndex) => {
                    const item =
                        selectedObjects[slotIndex];

                    return (
                        <div
                            key={slotIndex}
                            className={`${styles.traySlot} ${
                                item
                                    ? styles.traySlotFilled
                                    : ""
                            }`}
                        >
                            {item ? (
                                <TrayPiece item={item} />
                            ) : (
                                <span
                                    className={
                                        styles.emptySlotNumber
                                    }
                                >
                                    {slotIndex + 1}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function Home() {
    const [objects, setObjects] = useState<GameObject[]>([]);
    const [selectedObjects, setSelectedObjects] = useState<
        GameObject[]
    >([]);
    const [timeRemaining, setTimeRemaining] =
        useState(INITIAL_TIME);
    const [score, setScore] = useState(0);
    const [inputLocked, setInputLocked] = useState(false);
    const [message, setMessage] = useState(
        "Find two matching objects",
    );
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [hasWon, setHasWon] = useState(false);
    const [gameNumber, setGameNumber] = useState(0);
    const [trayStatus, setTrayStatus] =
        useState<TrayStatus>("idle");

    const remainingPairs = Math.ceil(objects.length / 2);

    const selectedIds = useMemo(
        () => selectedObjects.map((item) => item.id),
        [selectedObjects],
    );

    const startNewGame = useCallback(() => {
        setObjects(createGameObjects());
        setSelectedObjects([]);
        setTimeRemaining(INITIAL_TIME);
        setScore(0);
        setInputLocked(false);
        setMessage("Find two matching objects");
        setGameStarted(true);
        setGameOver(false);
        setHasWon(false);
        setTrayStatus("idle");
        setGameNumber(
            (currentGameNumber) => currentGameNumber + 1,
        );
    }, []);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    useEffect(() => {
        if (!gameStarted || gameOver || hasWon) {
            return;
        }

        const timerId = window.setInterval(() => {
            setTimeRemaining((currentTime) => {
                if (currentTime <= 1) {
                    window.clearInterval(timerId);
                    setGameOver(true);
                    setMessage("Time is up!");
                    return 0;
                }

                return currentTime - 1;
            });
        }, 1000);

        return () => {
            window.clearInterval(timerId);
        };
    }, [gameStarted, gameOver, hasWon]);

    const selectObject = useCallback(
        (item: GameObject) => {
            if (
                inputLocked ||
                gameOver ||
                hasWon ||
                selectedObjects.some(
                    (selectedItem) =>
                        selectedItem.id === item.id,
                )
            ) {
                return;
            }

            if (selectedObjects.length === 0) {
                setSelectedObjects([item]);
                setTrayStatus("idle");
                setMessage("Now find its match");
                return;
            }

            const firstObject = selectedObjects[0];
            const isMatch =
                firstObject.pairId === item.pairId;

            setSelectedObjects([firstObject, item]);
            setInputLocked(true);

            if (isMatch) {
                setTrayStatus("match");
                setMessage("Match!");

                window.setTimeout(() => {
                    setObjects((currentObjects) => {
                        const updatedObjects =
                            currentObjects.filter(
                                (currentObject) =>
                                    currentObject.id !==
                                        firstObject.id &&
                                    currentObject.id !==
                                        item.id,
                            );

                        if (updatedObjects.length === 0) {
                            setHasWon(true);
                            setMessage(
                                "You cleared the pile!",
                            );
                        }

                        return updatedObjects;
                    });

                    setScore(
                        (currentScore) =>
                            currentScore + 100,
                    );
                    setSelectedObjects([]);
                    setTrayStatus("idle");
                    setInputLocked(false);
                }, 650);

                return;
            }

            setTrayStatus("wrong");
            setMessage("Not a match");

            window.setTimeout(() => {
                setSelectedObjects([]);
                setScore((currentScore) =>
                    Math.max(0, currentScore - 10),
                );
                setTrayStatus("idle");
                setInputLocked(false);
                setMessage("Try another pair");
            }, 850);
        },
        [
            gameOver,
            hasWon,
            inputLocked,
            selectedObjects,
        ],
    );

    return (
        <main className={styles.page}>
            <section className={styles.gameShell}>
                <header className={styles.topBar}>
                    <div className={styles.statBlock}>
                        <span className={styles.statLabel}>
                            LEVEL
                        </span>
                        <strong className={styles.statValue}>
                            1
                        </strong>
                    </div>

                    <div className={styles.timer}>
                        <span aria-hidden="true">⏱️</span>
                        <strong>{timeRemaining}</strong>
                    </div>

                    <div className={styles.statBlock}>
                        <span className={styles.statLabel}>
                            SCORE
                        </span>
                        <strong className={styles.statValue}>
                            {score}
                        </strong>
                    </div>
                </header>

                <div className={styles.messageBar}>
                    {message}
                </div>

                <div className={styles.gameBoard}>
                    {objects.length > 0 && (
                        <GameScene
                            key={gameNumber}
                            objects={objects}
                            selectedIds={selectedIds}
                            inputLocked={inputLocked}
                            onSelect={selectObject}
                        />
                    )}

                    {!gameOver && !hasWon && (
                        <MatchTray
                            selectedObjects={
                                selectedObjects
                            }
                            status={trayStatus}
                        />
                    )}

                    {(gameOver || hasWon) && (
                        <div className={styles.overlay}>
                            <div
                                className={styles.resultCard}
                            >
                                <span
                                    className={
                                        styles.resultEmoji
                                    }
                                >
                                    {hasWon ? "🎉" : "⏰"}
                                </span>

                                <h1>
                                    {hasWon
                                        ? "Pile Cleared!"
                                        : "Time’s Up!"}
                                </h1>

                                <p>Your score: {score}</p>

                                <button
                                    type="button"
                                    onClick={startNewGame}
                                    className={
                                        styles.primaryButton
                                    }
                                >
                                    Play Again
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <footer className={styles.bottomPanel}>
                    <div>
                        <span className={styles.bottomLabel}>
                            PAIRS LEFT
                        </span>
                        <strong>{remainingPairs}</strong>
                    </div>

                    <button
                        type="button"
                        className={styles.restartButton}
                        onClick={startNewGame}
                    >
                        Restart
                    </button>
                </footer>
            </section>
        </main>
    );
}