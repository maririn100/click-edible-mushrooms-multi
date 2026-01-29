function main() {
	const scene = new g.Scene({
		game: g.game,
		assetIds: ["background", "edibleMushroom", "poisonousMushroom", "crown"]
	});

	scene.onLoad.add(() => {
		let gameState: "title" | "playing" | "result" = "title";
		const scores: { [key: string]: number } = {};
		const scoreLabels: { [key: string]: g.Label } = {};
		// 生成されたキノコの管理用
		const mushroomMap: { [key: number]: g.E } = {};

		// レイヤー分け
		const backgroundLayer = new g.E({ scene });
		const gameLayer = new g.E({ scene });
		const uiLayer = new g.E({ scene });
		scene.append(backgroundLayer);
		scene.append(gameLayer);
		scene.append(uiLayer);

		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 24
		});

		// 背景
		const initBackground = () => {
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
		};

		// ボタン作成処理
		const createButton = (text: string, y: number, color: string, onClick: () => void) => {
			const btn = new g.E({ scene, x: (g.game.width - 200) / 2, y, width: 200, height: 60, touchable: true });
			btn.append(new g.FilledRect({ scene, cssColor: color, width: 200, height: 60 }));
			btn.append(new g.Label({ scene, text, font, fontSize: 30, textColor: "white", x: 40, y: 12 }));
			btn.onPointDown.add(onClick);
			return btn;
		};

		// プレイヤー登録（スコアラベル作成）
		const registerPlayer = (pid: string) => {
			// 既に登録済み、また4人以上の場合は何もしない
			if (scores[pid] !== undefined || Object.keys(scores).length >= 4) return;
			scores[pid] = 0;
			const label = new g.Label({
				scene,
				text: `Player ${pid}: 0`,
				font,
				textColor: pid === g.game.selfId ? "green" : "black", // 自分は緑
				x: 10,
				y: 10 + ((Object.keys(scores).length - 1) * 30)
			});
			uiLayer.append(label);
			scoreLabels[pid] = label;
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
				if (mushroom.destroyed() === false) {
					mushroom.destroy();
					delete mushroomMap[mushroom.id];
				}
			}, 3000);
		};

		const showTitle = () => {
			gameState = "title";
			uiLayer.children?.slice().forEach(c => c.destroy());
			const startBtn = createButton("START", 200, "#2ecc71", () => {
				g.game.raiseEvent(new g.MessageEvent({ type: "req_start" }));
			});
			uiLayer.append(startBtn);
		};

		const startGame = () => {
			gameState = "playing";
			uiLayer.children?.slice().forEach(c => c.destroy());
			Object.keys(scores).forEach(pid => {
				scores[pid] = 0;
				registerPlayer(pid); // スコアラベル再生成
			});

			scene.setTimeout(() => {
				finishGame();
			}, 30000);
		};

		const finishGame = () => {
			gameState = "result";
			gameLayer.children?.slice().forEach(c => c.destroy());
			// 暗転背景
			const resultBg = new g.FilledRect({
				scene, cssColor: "black", opacity: 0.7, width: g.game.width, height: g.game.height
			});
			uiLayer.append(resultBg);

			// "結果発表" タイトルの表示
			const resultTitle = new g.Label({
				scene,
				text: "--- 結果発表 ---",
				font,
				fontSize: 40,
				textColor: "white",
				x: (g.game.width - 240) / 2, // 中央寄せ
				y: 50
			});
			uiLayer.append(resultTitle);

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

				const isMe = (player.id === g.game.selfId);
				const rowY = 120 + (index * 45);

				// 行コンテナの作成
				const rowContainer = new g.E({
					scene,
					x: 100, // 左端からの位置
					y: rowY,
					width: g.game.width - 200,
					height: 40
				});
				uiLayer.append(rowContainer);

				// 王冠の表示（1位タイ全員）
				if (player.score === topScore && topScore > 0) {
					const src = scene.asset.getImageById("crown");
					const crown = new g.Sprite({
						scene,
						src,
						x: -45, // 位置を微調整（画像の幅に合わせて変えてください）
						y: 3,  // テキストとの高さ調整
						srcWidth: src.width,
						srcHeight: src.height,
						width: 32,  // 表示したい横幅
						height: 32  // 表示したい縦幅
					});
					rowContainer.append(crown);
				}

				// 順位と名前のラベル
				const rankLabel = new g.Label({
					scene,
					text: `${displayRank}位: Player ${player.id.substring(0, 4)} ... ${player.score}点`,
					font,
					fontSize: 30,
					textColor: isMe ? "green" : "white",
					x: 0, // コンテナ内での相対座標
					y: 0
				});
				rowContainer.append(rankLabel);
			});

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
				uiLayer.append(noPlayerLabel);
			}

			// リスタートボタン
			const retryBtn = createButton("RETRY", 380, "#3498db", () => {
				g.game.raiseEvent(new g.MessageEvent({ type: "req_start" }));
			});
			uiLayer.append(retryBtn);

		};

		// メッセージ受信
		scene.onMessage.add((ev) => {
			if (ev.data === undefined) return;
			if (ev.data.type === "req_start") {
				startGame();
			} else if (ev.data.type === "hit" && ev.data.playerId !== undefined && gameState === "playing") {
				const pid = ev.data.playerId;

				// もしプレイヤーがいなければ登録
				if (scores[pid] === undefined) {
					registerPlayer(pid);
				}

				const target = mushroomMap[ev.data.mushroomId];
				if (target !== undefined && target.destroyed() === false) {
					target.destroy();
					delete mushroomMap[ev.data.mushroomId];

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
					scene.setTimeout(() => { if (popup.destroyed() === false) popup.destroy(); }, 500);
				}
			}
		});

		// プレイヤー参加時
		g.game.onJoin.add((ev) => {
			registerPlayer(ev.player.id);
		});

		scene.setInterval(() => createMushroom(), 1000);

		// 初期化実行
		initBackground();
		showTitle();
	});

	g.game.pushScene(scene);
}

export = main;
