function main() {
	const scene = new g.Scene({
		game: g.game,
		assetIds: ["edibleMushroom", "poisonousMushroom"]
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

		// プレイヤー登録（スコアラベル作成）
		const registerPlayer = (pid: string) => {
			// 既に登録済み、また4人以上の場合は何もしない
			if (scores[pid] !== undefined || Object.keys(scores).length >= 4) return;

			scores[pid] = 0;
			const label = new g.Label({
				scene: scene,
				text: `Player ${pid}: 0`,
				font: font,
				textColor: (pid === g.game.selfId) ? "green" : "black", // 自分は緑
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
						font: font,
						fontSize: 20,
						textColor: ev.data.isPoison ? "red" : "cyan",
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
			const isPoison = g.game.random.generate() < 0.2; // 20%で毒
			const mushroom = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById(isPoison ? "poisonousMushroom" : "edibleMushroom"),
				x: g.game.random.generate() * (g.game.width - 64),
				y: g.game.random.generate() * (g.game.height - 64),
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

			// スコアデータを [ID, 点数] の配列に変換し、点数が高い順に並び替える
			const ranking = Object.keys(scores)
				.map(pid => ({ id: pid, score: scores[pid] }))
				.sort((a, b) => b.score - a.score);

			// 背景を少し暗くする（演出：半透明の黒い四角形を全画面に置く）
			const bg = new g.FilledRect({
				scene: scene,
				cssColor: "black",
				opacity: 0.7,
				width: g.game.width,
				height: g.game.height
			});
			scene.append(bg);

			// "RESULT" タイトルの表示
			const title = new g.Label({
				scene: scene,
				text: "--- RESULT ---",
				font: font,
				fontSize: 40,
				textColor: "yellow",
				x: (g.game.width - 240) / 2, // 中央寄せ
				y: 50
			});
			scene.append(title);

			// 各プレイヤーの順位を表示
			ranking.forEach((player, index) => {
				const isMe = (player.id === g.game.selfId);
				const rowY = 120 + (index * 45); // その行の基準の高さ

				// 1行分をまとめる透明なコンテナ
				const rowContainer = new g.E({ scene: scene, x: 100, y: rowY });
				scene.append(rowContainer);

				// 王冠（1位の時だけ追加）
				if (index === 0) {
					const crown = new g.Label({
						scene: scene,
						text: "👑",
						font: font,
						fontSize: 30,
						x: -40, // Containerの左側に出す
						y: -5   // ここで微調整！
					});
					rowContainer.append(crown);
				}

				// 順位・名前・スコアのテキスト
				const rankLabel = new g.Label({
					scene: scene,
					text: `${index + 1}位: Player ${player.id.substring(0, 4)} ... ${player.score}点`,
					font: font,
					fontSize: 30,
					textColor: isMe ? "green" : "white",
					x: 0,
					y: 0 // コンテナの基準点に合わせる
				});
				rowContainer.append(rankLabel);
			});

		}, 30000);
	});

	g.game.pushScene(scene);
}

export = main;
