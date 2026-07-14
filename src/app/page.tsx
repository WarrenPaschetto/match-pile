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

type TrayStatus = "idle" | "match" | "full";

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
    disabled: boolean;
    onSelect: (item: GameObject) => void;
};

type GameSceneProps = {
    objects: GameObject[];
    inputLocked: boolean;
    onSelect: (item: GameObject) => void;
};

type MatchTrayProps = {
    trayObjects: GameObject[];
    matchingIds: string[];
    status: TrayStatus;
};

const INITIAL_TIME = 60;
const INITIAL_LIVES = 3;
const MAX_TRAY_SLOTS = 6;

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

    for (
        let index = shuffled.length - 1;
        index > 0;
        index -= 1
    ) {
        const randomIndex = Math.floor(
            Math.random() * (index + 1),
        );

        [shuffled[index], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[index],
        ];
    }

    return shuffled;
}

function createDropPosition(
    index: number,
): [number, number, number] {
    const column = index % 4;
    const row = Math.floor(index / 4);

    return [
        -2.25 +
            column * 1.5 +
            (Math.random() - 0.5) * 0.35,
        3.5 + row * 1.25 + Math.random() * 1.2,
        (Math.random() - 0.5) * 1.8,
    ];
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

    return shuffle(pairs).map((item, index) => ({
        ...item,
        position: createDropPosition(index),
        rotation: [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
        ],
        scale: 0.72 + Math.random() * 0.16,
    }));
}

function prepareObjectsForReturn(
    items: GameObject[],
): GameObject[] {
    return items.map((item, index) => ({
        ...item,
        position: [
            -2.4 + (index % 4) * 1.6,
            4.5 + Math.floor(index / 4) * 1.4,
            (Math.random() - 0.5) * 1.6,
        ],
        rotation: [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
        ],
    }));
}

function ShapeGeometry({
    shape,
}: {
    shape: ShapeType;
}) {
    switch (shape) {
        case "sphere":
            return (
                <sphereGeometry args={[0.72, 32, 32]} />
            );

        case "cone":
            return (
                <coneGeometry args={[0.72, 1.45, 32]} />
            );

        case "cylinder":
            return (
                <cylinderGeometry
                    args={[0.64, 0.64, 1.35, 32]}
                />
            );

        case "torus":
            return (
                <torusGeometry
                    args={[0.58, 0.25, 20, 40]}
                />
            );

        case "capsule":
            return (
                <capsuleGeometry
                    args={[0.48, 0.75, 10, 20]}
                />
            );

        default:
            return null;
    }
}

function ObjectPiece({
    item,
    disabled,
    onSelect,
}: ObjectPieceProps) {
    const handleClick = (
        event: ThreeEvent<MouseEvent>,
    ) => {
        event.stopPropagation();

        if (!disabled) {
            onSelect(item);
        }
    };

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
                    scale={item.scale}
                    onClick={handleClick}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial
                        color={item.color}
                        roughness={0.34}
                        metalness={0.08}
                    />
                </RoundedBox>
            ) : (
                <mesh
                    scale={item.scale}
                    onClick={handleClick}
                    castShadow
                    receiveShadow
                >
                    <ShapeGeometry shape={item.shape} />

                    <meshStandardMaterial
                        color={item.color}
                        roughness={0.34}
                        metalness={0.08}
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

function GameScene({
    objects,
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
            <color
                attach="background"
                args={["#17202a"]}
            />

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
                            disabled={inputLocked}
                            onSelect={onSelect}
                        />
                    ))}
                </Physics>
            </Suspense>
        </Canvas>
    );
}

function TrayPiece({
    item,
    isMatching,
}: {
    item: GameObject;
    isMatching: boolean;
}) {
    const customProperties = {
        "--piece-color": item.color,
    } as CSSProperties;

    return (
        <div
            className={`${styles.smallTrayPiece} ${
                isMatching
                    ? styles.smallTrayPieceMatching
                    : ""
            }`}
        >
            <div
                className={`${styles.smallTrayShape} ${
                    styles[
                        `smallTrayShape_${item.shape}`
                    ]
                }`}
                style={customProperties}
            />
        </div>
    );
}

function MatchTray({
    trayObjects,
    matchingIds,
    status,
}: MatchTrayProps) {
    return (
        <div
            className={`${styles.matchTray} ${
                status === "match"
                    ? styles.matchTraySuccess
                    : ""
            } ${
                status === "full"
                    ? styles.matchTrayFull
                    : ""
            }`}
        >
            <div className={styles.trayHeader}>
                <span>MATCH TRAY</span>

                <strong>
                    {trayObjects.length}/{MAX_TRAY_SLOTS}
                </strong>
            </div>

            <div className={styles.traySlots}>
                {Array.from({
                    length: MAX_TRAY_SLOTS,
                }).map((_, slotIndex) => {
                    const item = trayObjects[slotIndex];

                    return (
                        <div
                            key={slotIndex}
                            className={`${styles.traySlot} ${
                                item
                                    ? styles.traySlotFilled
                                    : ""
                            }`}
                        >
                            <div
                                className={
                                    styles.traySlotLine
                                }
                            />

                            {item && (
                                <TrayPiece
                                    item={item}
                                    isMatching={matchingIds.includes(
                                        item.id,
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function Home() {
    const [objects, setObjects] = useState<
        GameObject[]
    >([]);
    const [trayObjects, setTrayObjects] = useState<
        GameObject[]
    >([]);
    const [matchingIds, setMatchingIds] = useState<
        string[]
    >([]);
    const [timeRemaining, setTimeRemaining] =
        useState(INITIAL_TIME);
    const [score, setScore] = useState(0);
    const [lives, setLives] =
        useState(INITIAL_LIVES);
    const [inputLocked, setInputLocked] =
        useState(false);
    const [message, setMessage] = useState(
        "Select objects and build matches",
    );
    const [gameStarted, setGameStarted] =
        useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [hasWon, setHasWon] = useState(false);
    const [gameNumber, setGameNumber] = useState(0);
    const [trayStatus, setTrayStatus] =
        useState<TrayStatus>("idle");

    const remainingObjects =
        objects.length + trayObjects.length;

    const remainingPairs = Math.ceil(
        remainingObjects / 2,
    );

    const startNewGame = useCallback(() => {
        setObjects(createGameObjects());
        setTrayObjects([]);
        setMatchingIds([]);
        setTimeRemaining(INITIAL_TIME);
        setScore(0);
        setLives(INITIAL_LIVES);
        setInputLocked(false);
        setMessage(
            "Select objects and build matches",
        );
        setGameStarted(true);
        setGameOver(false);
        setHasWon(false);
        setTrayStatus("idle");
        setGameNumber(
            (currentGameNumber) =>
                currentGameNumber + 1,
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

    const handleFullTray = useCallback(
    (fullTray: GameObject[]) => {
        setInputLocked(true);
        setTrayStatus("full");
        setMessage("Tray full — life lost!");

        window.setTimeout(() => {
            const updatedLives = lives - 1;

            setLives(updatedLives);

            if (updatedLives <= 0) {
                setGameOver(true);
                setMessage("No lives remaining!");
                setTrayObjects([]);
                setMatchingIds([]);
                setTrayStatus("idle");
                return;
            }

            const returnedObjects =
                prepareObjectsForReturn(fullTray);

            setObjects((currentObjects) => {
                const existingIds = new Set(
                    currentObjects.map((object) => object.id),
                );

                const uniqueReturnedObjects =
                    returnedObjects.filter(
                        (object) =>
                            !existingIds.has(object.id),
                    );

                return [
                    ...currentObjects,
                    ...uniqueReturnedObjects,
                ];
            });

            setTrayObjects([]);
            setMatchingIds([]);
            setTrayStatus("idle");
            setInputLocked(false);
            setMessage("Tray cleared — keep matching");

            setGameNumber(
                (currentGameNumber) =>
                    currentGameNumber + 1,
            );
        }, 750);
    },
    [lives],
);

    const selectObject = useCallback(
        (item: GameObject) => {
            if (
                inputLocked ||
                gameOver ||
                hasWon ||
                trayObjects.length >= MAX_TRAY_SLOTS
            ) {
                return;
            }

            const matchingIndex =
                trayObjects.findIndex(
                    (trayItem) =>
                        trayItem.pairId === item.pairId,
                );

            const updatedTray = [...trayObjects];

            if (matchingIndex >= 0) {
                updatedTray.splice(
                    matchingIndex + 1,
                    0,
                    item,
                );
            } else {
                updatedTray.push(item);
            }

            setObjects((currentObjects) =>
                currentObjects.filter(
                    (currentObject) =>
                        currentObject.id !== item.id,
                ),
            );

            setTrayObjects(updatedTray);

            if (matchingIndex >= 0) {
                const matchingItem =
                    trayObjects[matchingIndex];

                setInputLocked(true);
                setTrayStatus("match");
                setMatchingIds([
                    matchingItem.id,
                    item.id,
                ]);
                setMessage("Match!");

                window.setTimeout(() => {
                    setTrayObjects((currentTray) =>
                        currentTray.filter(
                            (trayItem) =>
                                trayItem.id !==
                                    matchingItem.id &&
                                trayItem.id !== item.id,
                        ),
                    );

                    setMatchingIds([]);
                    setTrayStatus("idle");
                    setScore(
                        (currentScore) =>
                            currentScore + 100,
                    );
                    setInputLocked(false);
                    setMessage(
                        "Keep finding matches",
                    );

                    const objectsOutsideTray =
                        objects.length - 1;

                    const unmatchedTrayCount =
                        updatedTray.length - 2;

                    if (
                        objectsOutsideTray === 0 &&
                        unmatchedTrayCount === 0
                    ) {
                        setHasWon(true);
                        setMessage(
                            "You cleared the pile!",
                        );
                    }
                }, 600);

                return;
            }

            setMessage(
                `${updatedTray.length} of ${MAX_TRAY_SLOTS} tray slots filled`,
            );

            if (
                updatedTray.length ===
                MAX_TRAY_SLOTS
            ) {
                handleFullTray(updatedTray);
            }
        },
        [
            gameOver,
            handleFullTray,
            hasWon,
            inputLocked,
            objects.length,
            trayObjects,
        ],
    );

    return (
        <main className={styles.page}>
            <section className={styles.gameShell}>
                <header className={styles.topBar}>
                    <div className={styles.statBlock}>
                        <span
                            className={styles.statLabel}
                        >
                            LEVEL
                        </span>

                        <strong
                            className={styles.statValue}
                        >
                            1
                        </strong>
                    </div>

                    <div className={styles.timer}>
                        <span aria-hidden="true">
                            ⏱️
                        </span>

                        <strong>
                            {timeRemaining}
                        </strong>
                    </div>

                    <div className={styles.statBlock}>
                        <span
                            className={styles.statLabel}
                        >
                            SCORE
                        </span>

                        <strong
                            className={styles.statValue}
                        >
                            {score}
                        </strong>
                    </div>
                </header>

                <div className={styles.messageBar}>
                    <span>{message}</span>

                    <span className={styles.lives}>
                        {Array.from({
                            length: INITIAL_LIVES,
                        }).map((_, index) => (
                            <span
                                key={index}
                                className={
                                    index < lives
                                        ? styles.lifeActive
                                        : styles.lifeLost
                                }
                            >
                                ♥
                            </span>
                        ))}
                    </span>
                </div>

                <div className={styles.gameBoard}>
                    {objects.length > 0 && (
                        <GameScene
                            key={gameNumber}
                            objects={objects}
                            inputLocked={inputLocked}
                            onSelect={selectObject}
                        />
                    )}

                    {!gameOver && !hasWon && (
                        <MatchTray
                            trayObjects={trayObjects}
                            matchingIds={matchingIds}
                            status={trayStatus}
                        />
                    )}

                    {(gameOver || hasWon) && (
                        <div className={styles.overlay}>
                            <div
                                className={
                                    styles.resultCard
                                }
                            >
                                <span
                                    className={
                                        styles.resultEmoji
                                    }
                                >
                                    {hasWon ? "🎉" : "💔"}
                                </span>

                                <h1>
                                    {hasWon
                                        ? "Pile Cleared!"
                                        : "Game Over"}
                                </h1>

                                <p>
                                    Your score: {score}
                                </p>

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

                <footer
                    className={styles.bottomPanel}
                >
                    <div>
                        <span
                            className={
                                styles.bottomLabel
                            }
                        >
                            PAIRS LEFT
                        </span>

                        <strong>
                            {remainingPairs}
                        </strong>
                    </div>

                    <button
                        type="button"
                        className={
                            styles.restartButton
                        }
                        onClick={startNewGame}
                    >
                        Restart
                    </button>
                </footer>
            </section>
        </main>
    );
}