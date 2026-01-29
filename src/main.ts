function main() {
	const scene = new g.Scene({
		game: g.game,
		assetIds: ["background", "edibleMushroom", "poisonousMushroom", "crown"]
	});

	scene.onLoad.add(() => {
		const scores: { [key: string]: number } = {};
		const scoreLabels: { [key: string]: g.Label } = {};
		// 生成されたキノコの管理用
		const mushroomMap: { [key: number]: g.E } = {};
		// 制限時間終了後に操作不能にするためのフラグ
		let isGameActive = true;

		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 24
		});

		// 背景
		const backgroundSrc = scene.asset.getImageById("background");
		const background = new g.Sprite({
			scene: scene,
			src: backgroundSrc,
			srcWidth: backgroundSrc.width,
			srcHeight: backgroundSrc.height,
			width: g.game.width,
			height: g.game.height
		});
		scene.append(background);

		// プレイヤー登録（スコアラベル作成）
		const registerPlayer = (pid: string) => {
			// 既に登録済み、また4人以上の場合は何もしない
			if (scores[pid] !== undefined || Object.keys(scores).length >= 4) return;

			scores[pid] = 0;
			const label = new g.Label({
				scene: scene,
				text: `Player ${pid}: 0`,
				font,
				textColor: pid === g.game.selfId ? "green" : "black", // 自分は緑
				x: 10,
				y: 10 + ((Object.keys(scores).length - 1) * 30)
			});
			scene.append(label);
			scoreLabels[pid] = label;
		};

		// プレイヤー参加時
		g.game.onJoin.add((ev) => {
			registerPlayer(ev.player.id);
		});

		// メッセージ受信
		scene.onMessage.add((ev) => {
			if (ev.data !== undefined && ev.data.type === "hit" && ev.data.playerId !== undefined) {
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
					scene.append(popup);
					scene.setTimeout(() => { if (popup.destroyed() === false) popup.destroy(); }, 500);
				}
			}
		});

		// キノコ生成
		const createMushroom = () => {
			if (isGameActive === false) return;
			// スコアラベルが並ぶ高さを考慮（10px + 4人分 * 30px + 少しの余裕）
			const safeZoneHeight = 150;
			const isPoison = g.game.random.generate() < 0.2; // 20%で毒
			const mushroomSrc = scene.asset.getImageById(isPoison ? "poisonousMushroom" : "edibleMushroom");
			const mushroom = new g.Sprite({
				scene: scene,
				src: mushroomSrc,
				x: g.game.random.generate() * (g.game.width - 64),
				// y座標をsafeZoneHeight分だけ下にずらし、その分ランダム範囲を狭める
				y: safeZoneHeight + (g.game.random.generate() * (g.game.height - safeZoneHeight - 64)),
				srcWidth: mushroomSrc.width,
				srcHeight: mushroomSrc.height,
				width: 32,
				height: 32,
				touchable: true,
			});

			// キノコオブジェクト自体に毒フラグを持たせる
			(mushroom as any).isPoison = isPoison;

			mushroomMap[mushroom.id] = mushroom;
			mushroom.onPointDown.add((ev) => {
				if (isGameActive === false) return;

				g.game.raiseEvent(new g.MessageEvent({
					type: "hit",
					mushroomId: mushroom.id,
					isPoison: (mushroom as any).isPoison, // その個体が毒だったかを送る
					playerId: ev.player.id
				}));
			});
			scene.append(mushroom);
			scene.setTimeout(() => {
				if (mushroom.destroyed() === false) {
					mushroom.destroy();
					delete mushroomMap[mushroom.id];
				}
			}, 3000);
		};

		scene.setInterval(() => createMushroom(), 1000);

		// 30秒で終了
		scene.setTimeout(() => {
			isGameActive = false;

			// 背景暗転
			const bg = new g.FilledRect({
				scene: scene,
				cssColor: "black",
				opacity: 0.7,
				width: g.game.width,
				height: g.game.height
			});
			scene.append(bg);

			// "結果発表" タイトルの表示
			const title = new g.Label({
				scene: scene,
				text: "--- 結果発表 ---",
				font,
				fontSize: 40,
				textColor: "white",
				x: (g.game.width - 240) / 2, // 中央寄せ
				y: 50
			});
			scene.append(title);

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
					scene: scene,
					x: 100, // 左端からの位置
					y: rowY,
					width: g.game.width - 200,
					height: 40
				});
				scene.append(rowContainer);

				// 王冠の表示（1位タイ全員）
				if (player.score === topScore && topScore > 0) {
					const crownSrc = scene.asset.getImageById("crown");
					const crown = new g.Sprite({
						scene: scene,
						src: crownSrc,
						x: -45, // 位置を微調整（画像の幅に合わせて変えてください）
						y: 3,  // テキストとの高さ調整
						srcWidth: crownSrc.width,
						srcHeight: crownSrc.height,
						width: 32,  // 表示したい横幅
						height: 32  // 表示したい縦幅
					});
					rowContainer.append(crown);
				}

				// 順位と名前のラベル
				const rankLabel = new g.Label({
					scene: scene,
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
					scene: scene,
					text: "参加者がいませんでした",
					font,
					fontSize: 24,
					textColor: "white",
					x: 100,
					y: 120
				});
				scene.append(noPlayerLabel);
			}
		}, 30000);
	});

	g.game.pushScene(scene);
}

export = main;
