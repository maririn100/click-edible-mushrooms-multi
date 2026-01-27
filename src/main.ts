function main() {
	const scene = new g.Scene({
		game: g.game,
		assetIds: ["edibleMushroom", "poisonousMushroom"]
	});
	scene.onLoad.add(() => {
		// 1. シーン共通で使う変数（スコア、マップ、制限時間など）の定義
		const scores: { [key: string]: number } = {};
		const scoreLabels: { [key: string]: g.Label } = {};
		// 生成されたキノコを管理するマップ（辞書）
		const mushroomMap: { [key: number]: g.E } = {};
		let isGameActive = true; // 制限時間終了後に操作不能にするためのフラグ

		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 24
		});

		// プレイヤー情報を登録し、ラベルを作る共通関数
		const registerPlayer = (pid: string | null | undefined) => {
			// pidがない、または既に登録済み、または4人以上の場合は何もしない
			if (!pid || scores[pid] !== undefined || Object.keys(scores).length >= 4) return;

			scores[pid] = 0;
			const label = new g.Label({
				scene: scene,
				text: `Player ${pid.substring(0, 4)}: 0`,
				font: font,
				fontSize: 24,
				textColor: (pid === g.game.selfId) ? "yellow" : "black", // 自分は黄色
				x: 10,
				y: 10 + (Object.keys(scores).length * 30)
			});
			scene.append(label);
			scoreLabels[pid] = label;
		};


		// 2. プレイヤーが参加した時の処理 (onJoin)
		// --- 参加プレイヤーを4人までに制限する処理 ---
		g.game.onJoin.add((ev) => {
			registerPlayer(ev.player.id);
		});

		// メッセージ受信
		scene.onMessage.add((ev) => {
			const data: any = ev.data;
			if (data && data.type === "hit" && ev.player && ev.player.id) {
				const pid = ev.player.id;

				// 【重要】もしscoresにこのプレイヤーがいなければその場で登録
				if (scores[pid] === undefined) {
					registerPlayer(pid);
				}

				const target = mushroomMap[data.mushroomId];
				if (target && !target.destroyed()) {
					target.destroy();
					delete mushroomMap[data.mushroomId];

					// スコア加算・減算
					const point = data.isPoison ? -50 : 10;
					scores[pid] += point;

					// ラベル更新
					const displayName = pid ? pid.substring(0, 4) : "???";
					scoreLabels[pid].text = `Player ${displayName}: ${scores[pid]}`;
					scoreLabels[pid].invalidate();

					// 【演出】叩いた瞬間に名前を出す
					const popup = new g.Label({
						scene: scene,
						text: `${displayName} ${point > 0 ? "+" : ""}${point}`,
						font: font,
						fontSize: 20,
						textColor: data.isPoison ? "red" : "cyan",
						x: target.x,
						y: target.y
					});
					scene.append(popup);
					scene.setTimeout(() => { if (!popup.destroyed()) popup.destroy(); }, 500);
				}
			}
		});

		// キノコ生成
		const createMushroom = () => {
			if (!isGameActive) return;
			const isPoison = g.game.random.generate() < 0.2; // 20%で毒
			const mushroom = new g.Sprite({
				scene: scene,
				src: scene.asset.getImageById(isPoison ? "poisonousMushroom" : "edibleMushroom"),
				x: g.game.random.generate() * (g.game.width - 64),
				y: g.game.random.generate() * (g.game.height - 64),
				touchable: true,
			});

			mushroomMap[mushroom.id] = mushroom;
			mushroom.onPointDown.add(() => {
				if (!isGameActive) return;
				g.game.raiseEvent(new g.MessageEvent({
					type: "hit",
					mushroomId: mushroom.id,
					isPoison: isPoison
				}));
			});
			scene.append(mushroom);
			scene.setTimeout(() => {
				if (!mushroom.destroyed()) {
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
				text: `FINISH! Winner: ${winnerId.substring(0, 4)}`,
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
