function main() {
	const scene = new g.Scene({
		game: g.game,
		assetIds: ["background", "edibleMushroom", "poisonousMushroom", "crown", "se_correct", "se_incorrect", "se_win", "se_lose", "se_button"]
	});

	scene.onLoad.add(() => {
		let gameState: "title" | "playing" | "result" = "title";
		const scores: { [key: string]: number } = {};
		const scoreLabels: { [key: string]: g.Label } = {};
		// 生成されたキノコの管理用
		const mushroomMap: { [key: number]: g.E } = {};
		// キノコタイマー保存用
		let mushroomTimer: g.TimerIdentifier | undefined;

		// レイヤー分け
		const backgroundLayer = new g.E({ scene });
		const gameLayer = new g.E({ scene });
		const scoreLayer = new g.E({ scene });
		const resultLayer = new g.E({ scene });
		scene.append(backgroundLayer);
		scene.append(gameLayer);
		scene.append(scoreLayer);
		scene.append(resultLayer);

		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 24
		});

		const init = () => {
			// ゲーム背景
			const src = scene.asset.getImageById("background");
			const bg = new g.Sprite({
				scene,
				src,
				srcWidth: src.width,
				srcHeight: src.height,
				width: g.game.width,
				height: g.game.height
			});
			backgroundLayer.append(bg);
			showTitle();
		};

		// ボタン作成
		const createButton = (text: string, y: number, color: string, onClick: () => void, strokeColor?: string) => {
			const width = 200;
			const height = 60;
			const fontSize = 30;
			const padding = 2; // 枠線の太さ

			const btn = new g.E({ scene, x: (g.game.width - width) / 2, y, width, height, touchable: true });
			btn.append(new g.FilledRect({ scene, cssColor: strokeColor || "transparent", width, height }));
			btn.append(new g.FilledRect({
				scene,
				cssColor: color,
				x: strokeColor ? padding : 0,
				y: strokeColor ? padding : 0,
				width: strokeColor ? width - padding * 2 : width,
				height: strokeColor ? height - padding * 2 : height
			}));
			const label = new g.Label({
				scene,
				text,
				font,
				fontSize,
				textColor: "white",
				x: 0,
				y: (height - fontSize) / 2 - 3,
			});
			label.x = (width - label.width) / 2;
			btn.append(label);
			btn.onPointDown.add(onClick);
			return btn;
		};

		// プレイヤー登録（スコアラベル作成）
		const registerPlayer = (pid: string): boolean => {
			// 既に登録済みの場合は、この後の処理をせずに参加OKを返す
			if (scores[pid] !== undefined) return true;
			// 5人目以降は参加NGなので、この後の処理はせずに参加NGを返す
			if (Object.keys(scores).length >= 4) return false;
			scores[pid] = 0;
			const label = new g.Label({
				scene,
				text: `Player ${pid}: 0`,
				font,
				textColor: pid === g.game.selfId ? "green" : "black", // 自分は緑
				x: 10,
				y: 10 + ((Object.keys(scores).length - 1) * 30)
			});
			scoreLayer.append(label);
			scoreLabels[pid] = label;
			return true;
		};

		// キノコ生成
		const createMushroom = () => {
			if (gameState !== "playing") return;
			// スコアラベルが並ぶ高さを考慮（10px + 4人分 * 30px + @）
			const safeZoneHeight = 150;
			const isPoison = g.game.random.generate() < 0.2; // 20%で毒
			const src = scene.asset.getImageById(isPoison ? "poisonousMushroom" : "edibleMushroom");
			const mushroom = new g.Sprite({
				scene,
				src,
				x: g.game.random.generate() * (g.game.width - 64),
				// y座標をsafeZoneHeight分だけ下にずらし、その分ランダム範囲を狭める
				y: safeZoneHeight + (g.game.random.generate() * (g.game.height - safeZoneHeight - 64)),
				srcWidth: src.width,
				srcHeight: src.height,
				width: 32,
				height: 32,
				touchable: true,
			});
			mushroomMap[mushroom.id] = mushroom;
			mushroom.onPointDown.add((ev) => {
				if (gameState !== "playing") return;
				g.game.raiseEvent(new g.MessageEvent({
					type: "hit",
					mushroomId: mushroom.id,
					isPoison,
					playerId: ev.player.id
				}));
			});
			gameLayer.append(mushroom);
			scene.setTimeout(() => {
				const target = mushroomMap[mushroom.id];
				if (target !== undefined && target.destroyed() === false) {
					delete mushroomMap[mushroom.id];
					fadeOutAndDestroy(target);
				}
			}, 3000);
		};

		const fadeOutAndDestroy = (target: g.E) => {
			if (target === undefined || target.destroyed() === true) return;

			target.touchable = false;
			target.onUpdate.add(() => {
				target.opacity -= 0.1;
				target.modified();

				if (target.opacity <= 0) {
					target.destroy();
				}
			});
		};

		const resetScore = () => {
			Object.keys(scores).forEach(pid => {
				scores[pid] = 0;
				if (scoreLabels[pid] !== undefined) {
					scoreLabels[pid].text = `Player ${pid}: 0`;
					scoreLabels[pid].invalidate();
				}
			});
		};

		const showTitle = () => {
			gameState = "title";
			resultLayer.children?.slice().forEach(c => c.destroy());
			resetScore();

			const easyBtn = createButton("EASY", 250, "#2ecc71", () => {
				g.game.raiseEvent(new g.MessageEvent({ type: "req_start", interval: 1500 }));
			}, "green");
			const normalBtn = createButton("NORMAL", 330, "#3498db", () => {
				g.game.raiseEvent(new g.MessageEvent({ type: "req_start", interval: 1000 }));
			}, "blue");
			const hardBtn = createButton("HARD", 410, "#ef5724", () => {
				g.game.raiseEvent(new g.MessageEvent({ type: "req_start", interval: 500 }));
			}, "red");
			resultLayer.append(easyBtn);
			resultLayer.append(normalBtn);
			resultLayer.append(hardBtn);
		};

		const startGame = (spawnInterval: number) => {
			gameState = "playing";

			// 既存のキノコタイマーがあれば停止
			if (mushroomTimer !== undefined) {
				scene.clearInterval(mushroomTimer);
			}
			// 新しくキノコタイマーを開始
			mushroomTimer = scene.setInterval(() => {
				createMushroom();
			}, spawnInterval);

			resultLayer.children?.slice().forEach(c => c.destroy());

			// 30秒経ったらゲーム終了
			scene.setTimeout(() => {
				finishGame();
			}, 30000);
		};

		const finishGame = () => {
			gameState = "result";

			// キノコタイマーを止める
			if (mushroomTimer !== undefined) {
				scene.clearInterval(mushroomTimer);
				mushroomTimer = undefined;
			}

			gameLayer.children?.slice().forEach(c => c.destroy());
			// 結果発表時の背景
			const resultBg = new g.FilledRect({
				scene, cssColor: "black", width: g.game.width, height: g.game.height
			});
			resultLayer.append(resultBg);

			// "結果発表" タイトルの表示
			const resultTitle = new g.Label({
				scene,
				text: "-- 結果発表 --",
				font,
				fontSize: 40,
				textColor: "white",
				x: (g.game.width - 240) / 2, // 中央寄せ
				y: 50
			});
			resultLayer.append(resultTitle);

			const ranking = Object.keys(scores)
				.map(pid => ({ id: pid, score: scores[pid] }))
				.sort((a, b) => b.score - a.score);
			let displayRank = 1;
			const topScore = ranking.length > 0 ? ranking[0].score : -Infinity;

			ranking.forEach((player, index) => {
				// スコアが下がったタイミングで順位を更新（同点なら維持）
				if (index > 0 && player.score < ranking[index - 1].score) {
					displayRank = index + 1;
				}

				const rowY = 120 + (index * 45);

				// 行コンテナの作成
				const rowContainer = new g.E({
					scene,
					x: 100,
					y: rowY,
					width: g.game.width - 200,
					height: 40
				});
				resultLayer.append(rowContainer);

				// 王冠の表示（1位タイ全員）
				if (player.score === topScore && topScore > 0) {
					const src = scene.asset.getImageById("crown");
					const crown = new g.Sprite({
						scene,
						src,
						x: -45,
						y: 3,
						srcWidth: src.width,
						srcHeight: src.height,
						width: 32,
						height: 32,
					});
					rowContainer.append(crown);
				}

				// 順位と名前
				const rankLabel = new g.Label({
					scene,
					text: `${displayRank}位: Player ${player.id.substring(0, 4)} ... ${player.score}点`,
					font,
					fontSize: 30,
					textColor: player.id === g.game.selfId ? "green" : "white",
					x: 0,
					y: 0,
				});
				rowContainer.append(rankLabel);
			});

			// 参加者がいない場合
			if (ranking.length === 0) {
				const noPlayerLabel = new g.Label({
					scene,
					text: "参加者がいませんでした",
					font,
					fontSize: 24,
					textColor: "white",
					x: 100,
					y: 120
				});
				resultLayer.append(noPlayerLabel);
			}

			// リトライボタン
			const retryBtn = createButton("RETRY", 550, "black", () => {
				g.game.raiseEvent(new g.MessageEvent({ type: "req_title" }));
			}, "white");
			resultLayer.append(retryBtn);

			const myScore = scores[g.game.selfId] || 0;
			const isSelfWinner = (myScore === topScore);
			const winSE = scene.asset.getAudioById("se_win");
			const loseSE = scene.asset.getAudioById("se_lose");
			if (isSelfWinner === true) {
				winSE.play();
			} else {
				loseSE.play();
			}
		};

		// メッセージ受信
		scene.onMessage.add((ev) => {
			if (ev.data === undefined) return;
			const buttonSE = scene.asset.getAudioById("se_button");
			if (ev.data.type === "req_start") {
				buttonSE.play();
				const interval = ev.data.interval || 1000;
				startGame(interval);
			} else if (ev.data.type === "req_title") {
				buttonSE.play();
				showTitle();
			}
			else if (ev.data.type === "hit" && ev.data.playerId !== undefined && gameState === "playing") {
				const pid = ev.data.playerId;
				if (registerPlayer(pid) === false) return;
				const target = mushroomMap[ev.data.mushroomId];
				if (target !== undefined && target.destroyed() === false) {
					delete mushroomMap[ev.data.mushroomId];
					fadeOutAndDestroy(target);

					// スコア加算・減算
					const point = ev.data.isPoison ? -50 : 10;
					scores[pid] += point;

					// ラベル更新
					scoreLabels[pid].text = `Player ${pid}: ${scores[pid]}`;
					scoreLabels[pid].invalidate();

					// キノコをクリックしたときにプレイヤー名+獲得ポイントを表示
					const popup = new g.Label({
						scene: scene,
						text: `${pid} ${point > 0 ? "+" : ""}${point}`,
						font,
						fontSize: 20,
						textColor: ev.data.isPoison ? "red" : pid === g.game.selfId ? "green" : "black",
						x: target.x,
						y: target.y
					});
					gameLayer.append(popup);
					const scoreSE = scene.asset.getAudioById(ev.data.isPoison ? "se_incorrect" : "se_correct");
					scoreSE.play();
					scene.setTimeout(() => { if (popup.destroyed() === false) popup.destroy(); }, 500);
				}
			}
		});

		// プレイヤー参加時
		g.game.onJoin.add((ev) => {
			registerPlayer(ev.player.id);
		});

		init();
	});

	g.game.pushScene(scene);
}

export = main;
