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
			// 勝者判定
			let winnerId = "";
			let maxScore = -999;
			for (const id in scores) {
				if (scores[id] > maxScore) {
					maxScore = scores[id];
					winnerId = id;
				}
			}
			const result = new g.Label({
				scene: scene,
				text: `FINISH! Winner: ${winnerId}`,
				font: font,
				fontSize: 50,
				textColor: "orange",
				x: 100,
				y: 200
			});
			scene.append(result);
		}, 30000);
	});

	g.game.pushScene(scene);
}

export = main;
