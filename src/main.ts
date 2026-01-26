import * as co from "@akashic-extension/collision-js";
import { AudioAsset, ImageAsset, Scene } from "@akashic/akashic-engine";

function scoreText(score: number, prefix: string) {
	// スコアテキスト設定
	return prefix + ":" + score;
}

function edibleMushroomCreate(scene: Scene, edibleMushroomImageAsset: ImageAsset, p_x: number, p_y: number) {
	// 食べられるキノコを生成
	const edibleMushroom = new g.Sprite({
		scene: scene,
		src: edibleMushroomImageAsset,
		width: edibleMushroomImageAsset.width,
		height: edibleMushroomImageAsset.height,
		hidden: true,
		x: p_x,
		y: p_y
	});

	return edibleMushroom;
}

function c_edibleMushroomCreate(edibleMushroom: g.Sprite, edibleMushroomImageAsset: ImageAsset) {
	// 食べられるキノコの接触範囲を設定
	const c_edibleMushroom: co.Circle = {
		position: { x: edibleMushroom.x, y: edibleMushroom.y },
		radius: edibleMushroomImageAsset.width / 4
	};

	return c_edibleMushroom;
}

function edibleMushroomMove(edibleMushroom: g.Sprite, c_edibleMushroom: co.Circle,
	c_player: co.Circle, eatAudioAsset: AudioAsset, score: number, scoreLabel: g.Label,
	gameover: g.Sprite, clear: g.Sprite, player: g.Sprite, moveSpeed: number, level: number,
	levelLabel: g.Label, levelup: g.Sprite, mainScene: Scene) {
	edibleMushroom.onUpdate.add(() => {
		if (edibleMushroom.x >= 640 && gameover.visible() === false && clear.visible() === false) {
			edibleMushroom.x = 0;
			edibleMushroom.show();
		}
		if (edibleMushroom.y >= 480 && gameover.visible() === false && clear.visible() === false) {
			edibleMushroom.y = 0;
			edibleMushroom.show();
		}

		// 食べられるキノコを左→右に動かす
		edibleMushroom.x += moveSpeed;
		c_edibleMushroom.position.x = edibleMushroom.x;

		// 食べられるキノコを上→下に動かす
		edibleMushroom.y += 1;
		c_edibleMushroom.position.y = edibleMushroom.y;

		if (co.circleToCircle(c_player, c_edibleMushroom)) {
			// 食べられるキノコと接触したら、食べる音を出し、食べられるキノコを消す（1回のみ）
			if (edibleMushroom.visible() === true) {
				eatAudioAsset.play();
				edibleMushroom.hide();
				++score;
				scoreLabel.text = scoreText(score, "SCORE");
				scoreLabel.invalidate();
				// 10点毎にレベルアップ
				if ((score % 10) === 0) {
					player.touchable = false;
					player.modified();
					clear.show();
					levelup.show();
				}
			}
		}
		// キノコの座標に変更があった場合、 modified() を実行して変更をゲームに通知
		edibleMushroom.modified();
	});
}

function poisonousMushroomCreate(scene: Scene, poisonousMushroomImageAsset: ImageAsset, p_x: number, p_y: number) {
	// 毒キノコを生成
	const poisonousMushroom = new g.Sprite({
		scene: scene,
		src: poisonousMushroomImageAsset,
		width: poisonousMushroomImageAsset.width,
		height: poisonousMushroomImageAsset.height,
		hidden: true,
		x: p_x,
		y: p_y
	});

	return poisonousMushroom;
}

function c_poisonousMushroomCreate(poisonousMushroom: g.Sprite, poisonousMushroomImageAsset: ImageAsset) {
	// 毒キノコの接触範囲を設定
	const c_poisonousMushroom: co.Circle = {
		position: { x: poisonousMushroom.x, y: poisonousMushroom.y },
		radius: poisonousMushroomImageAsset.width / 4
	};

	return c_poisonousMushroom;
}

function poisonousMushroomMove(poisonousMushroom: g.Sprite, c_poisonousMushroom: co.Circle,
	player: g.Sprite, c_player: co.Circle, sirenAudioAsset: AudioAsset, gameover: g.Sprite, clear: g.Sprite, restart: g.Sprite, moveSpeed: number) {
	poisonousMushroom.onUpdate.add(() => {
		if (poisonousMushroom.x >= 640 && gameover.visible() === false && clear.visible() === false) {
			poisonousMushroom.x = 0;
			poisonousMushroom.show();
		}
		// 毒キノコを左→右に動かす
		poisonousMushroom.x += moveSpeed;
		c_poisonousMushroom.position.x = poisonousMushroom.x;

		if (co.circleToCircle(c_player, c_poisonousMushroom)) {
			// 毒キノコと接触したら、救急車の音を出し、毒キノコを消す（1回のみ）
			if (poisonousMushroom.visible() === true && clear.visible() === false) {
				sirenAudioAsset.play();
				poisonousMushroom.hide();
				player.angle = 90;
				player.touchable = false;
				player.modified();
				gameover.show();
				restart.show();
			}
		}
		// キノコの座標に変更があった場合、 modified() を実行して変更をゲームに通知
		poisonousMushroom.modified();
	});
}

function start(startScene: Scene, mainScene: Scene) {
	startScene.onLoad.add(() => {
		const backgroundImageAsset = startScene.asset.getImageById("background");
		const startImageAsset = startScene.asset.getImageById("start");
		// 背景を生成
		const background = new g.Sprite({
			scene: startScene,
			src: backgroundImageAsset,
			width: backgroundImageAsset.width,
			height: backgroundImageAsset.height
		});
		startScene.append(background);

		// スタート画像を生成
		const start = new g.Sprite({
			scene: startScene,
			src: startImageAsset,
			width: startImageAsset.width,
			height: startImageAsset.height,
			touchable: true
		});

		// スタート画像の初期座標
		start.x = (g.game.width - start.width) / 2;
		start.y = (g.game.height - start.height) / 2;

		startScene.append(start);
		start.onPointUp.add(function () {
			g.game.replaceScene(mainScene);
		});
	});
}

function startSceneCreate() {
	const startScene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["background", "start"]
	});
	return startScene;
}

function mainSceneCreate() {
	const scene = new g.Scene({
		game: g.game,
		// このシーンで利用するアセットのIDを列挙し、シーンに通知します
		assetIds: ["player", "edibleMushroom", "eat", "background", "poisonousMushroom", "siren", "gameover", "clear", "restart", "levelup"]
	});
	return scene;
}

function mainLoad(mainScene: Scene, moveSpeed: number) {
	mainScene.onLoad.add(() => {
		// ここからゲーム内容を記述します

		// 各アセットオブジェクトを取得します
		const playerImageAsset = mainScene.asset.getImageById("player");
		const edibleMushroomImageAsset = mainScene.asset.getImageById("edibleMushroom");
		const eatAudioAsset = mainScene.asset.getAudioById("eat");
		const backgroundImageAsset = mainScene.asset.getImageById("background");
		const poisonousMushroomImageAsset = mainScene.asset.getImageById("poisonousMushroom");
		const sirenAudioAsset = mainScene.asset.getAudioById("siren");
		const gameoverImageAsset = mainScene.asset.getImageById("gameover");
		const clearImageAsset = mainScene.asset.getImageById("clear");
		const restartImageAsset = mainScene.asset.getImageById("restart");
		const levelupImageAsset = mainScene.asset.getImageById("levelup");

		// 背景を生成
		const background = new g.Sprite({
			scene: mainScene,
			src: backgroundImageAsset,
			width: backgroundImageAsset.width,
			height: backgroundImageAsset.height
		});
		mainScene.append(background);

		// ダイナミックフォントを生成
		const font = new g.DynamicFont({
			game: g.game,
			fontFamily: "sans-serif",
			size: 16
		});

		// レベルラベルを生成
		const levelLabel = new g.Label({
			scene: mainScene,
			font: font,
			text: "LEVEL:1",
			fontSize: font.size,
			x: 10,
			y: 10
		});

		// レベルの初期化
		let level: number = 1;

		mainScene.append(levelLabel);

		// スコアラベルを生成
		const scoreLabel = new g.Label({
			scene: mainScene,
			font: font,
			text: "SCORE:0",
			fontSize: font.size,
			x: 100,
			y: 10
		});

		// スコアの初期化
		let score: number = 0;

		mainScene.append(scoreLabel);

		// ゲームオーバー画像を生成
		const gameover = new g.Sprite({
			scene: mainScene,
			src: gameoverImageAsset,
			width: gameoverImageAsset.width,
			height: gameoverImageAsset.height,
			hidden: true
		});

		// ゲームオーバー画像の初期座標
		gameover.x = (g.game.width - gameover.width) / 2;
		gameover.y = (g.game.height - gameover.height) / 2;

		mainScene.append(gameover);

		// クリア画像を生成
		const clear = new g.Sprite({
			scene: mainScene,
			src: clearImageAsset,
			width: clearImageAsset.width,
			height: clearImageAsset.height,
			hidden: true
		});

		// クリア画像の初期座標
		clear.x = (g.game.width - clear.width) / 2;
		clear.y = (g.game.height - clear.height) / 2;

		mainScene.append(clear);

		// 再スタート画像を生成
		const restart = new g.Sprite({
			scene: mainScene,
			src: restartImageAsset,
			width: restartImageAsset.width,
			height: restartImageAsset.height,
			hidden: true,
			touchable: true
		});

		// 再スタート画像の初期座標
		restart.x = (g.game.width - restart.width) / 2;
		restart.y = (g.game.height - restart.height) / 1.3;

		mainScene.append(restart);
		restart.onPointUp.add(function () {
			const reStartScene = startSceneCreate();
			const reMainScene = mainSceneCreate();
			start(reStartScene, reMainScene);
			mainLoad(reMainScene, 5);
			g.game.replaceScene(reStartScene);
		});

		// レベルアップ画像を生成
		const levelup = new g.Sprite({
			scene: mainScene,
			src: levelupImageAsset,
			width: levelupImageAsset.width,
			height: levelupImageAsset.height,
			hidden: true,
			touchable: true
		});

		// レベルアップ画像の初期座標
		levelup.x = (g.game.width - levelup.width) / 2;
		levelup.y = (g.game.height - levelup.height) / 1.3;

		mainScene.append(levelup);

		// プレイヤー（キノコ君）を生成
		const player = new g.Sprite({
			scene: mainScene,
			src: playerImageAsset,
			width: playerImageAsset.width,
			height: playerImageAsset.height,
			touchable: true
		});

		// プレイヤー（キノコ君）の初期座標を、X軸は右寄り、Y軸は画面の中心に設定
		player.x = g.game.width - player.width;
		player.y = (g.game.height - player.height) / 2;

		// プレイヤー（キノコ君）の接触範囲を設定
		const c_player: co.Circle = {
			position: { x: player.x, y: player.y },
			radius: playerImageAsset.width / 4
		};

		// プレイヤー（キノコ君）をマウスで動かせるようにする
		player.onPointMove.add((event) => {
			player.x += event.prevDelta.x;
			player.y += event.prevDelta.y;

			c_player.position.x = player.x;
			c_player.position.y = player.y;

			player.modified();
		});

		mainScene.append(player);

		// 食べられるキノコを生成
		const edibleMushroom = edibleMushroomCreate(mainScene, edibleMushroomImageAsset, 0, 40);
		const c_edibleMushroom = c_edibleMushroomCreate(edibleMushroom, edibleMushroomImageAsset);
		// 食べられるキノコを即表示
		edibleMushroom.show();
		edibleMushroomMove(edibleMushroom, c_edibleMushroom, c_player, eatAudioAsset, score, scoreLabel, gameover, clear, player, 5, level, levelLabel, levelup, mainScene);
		mainScene.append(edibleMushroom);

		const poisonousMushroom: g.Sprite[] = [];
		const c_poisonousMushroom: co.Circle[] = [];
		// 毒キノコを表示
		for (let i = 0; i < 7; i++) {
			mainScene.setTimeout(function () {
				// 毒キノコを生成
				poisonousMushroom.push(poisonousMushroomCreate(mainScene, poisonousMushroomImageAsset, 0, 60 * (i + 1)));
				c_poisonousMushroom.push(c_poisonousMushroomCreate(poisonousMushroom[i], poisonousMushroomImageAsset));
				// 毒キノコを即表示
				poisonousMushroom[i].show();
				poisonousMushroomMove(poisonousMushroom[i], c_poisonousMushroom[i], player, c_player, sirenAudioAsset, gameover, clear, restart, moveSpeed);
				mainScene.append(poisonousMushroom[i]);
			}, i * 100);
		}

		levelup.onPointUp.add(function () {
			player.touchable = true;
			player.modified();
			clear.hide();
			levelup.hide();
			++level;
			levelLabel.text = scoreText(level, "LEVEL");
			levelLabel.invalidate();

			// 毒キノコをスピードアップ
			for (let i = 0; i < 7; i++) {
				mainScene.setTimeout(function () {
					mainScene.remove(poisonousMushroom[i]);
					poisonousMushroomMove(poisonousMushroom[i], c_poisonousMushroom[i], player, c_player, sirenAudioAsset, gameover, clear, restart, moveSpeed + (level * 0.001));
					mainScene.append(poisonousMushroom[i]);
				}, i * 100);
			}
		});
		// ここまでゲーム内容を記述します
	});

}

function main() {
	const startScene = startSceneCreate();
	const mainScene = mainSceneCreate();
	start(startScene, mainScene);
	mainLoad(mainScene, 5);
	g.game.pushScene(startScene);
}

export = main;
