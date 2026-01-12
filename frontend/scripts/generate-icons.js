#!/usr/bin/env node

/**
 * HoleHunter Icon Generator
 *
 * 此脚本使用 sharp 从 SVG 源文件生成各种平台所需的图标格式
 *
 * 依赖: npm install sharp
 *
 * 使用: npm run icon
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const svgSource = path.join(__dirname, '../build/icons/icon.svg');
const iconsDir = path.join(__dirname, '../build/icons');
const linuxIconsDir = path.join(iconsDir, 'linux');

// 确保目录存在
[iconsDir, linuxIconsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log('🎨 HoleHunter Icon Generator');
console.log('================================\n');

// 检查源 SVG 是否存在
if (!fs.existsSync(svgSource)) {
  console.error('❌ 错误: 找不到源图标文件');
  console.error(`   期望路径: ${svgSource}\n`);
  process.exit(1);
}

// 检查 sharp 是否安装
try {
  require('sharp');
} catch (e) {
  console.error('❌ 错误: 需要安装依赖\n');
  console.error('请运行: npm install sharp --save-dev\n');
  process.exit(1);
}

const sharp = require('sharp');

/**
 * 生成 PNG 图标（用于 Linux 和 Windows）
 */
async function generatePNG() {
  console.log('📦 生成 PNG 图标...');

  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];

  for (const size of sizes) {
    const outputPath = path.join(linuxIconsDir, `${size}x${size}.png`);
    await sharp(svgSource)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${size}x${size}.png`);
  }

  console.log('✅ PNG 图标生成完成\n');
}

/**
 * 生成 ICO 图标（Windows）
 * 使用 ImageMagick convert 命令
 */
function generateICO() {
  console.log('📦 生成 ICO 图标 (Windows)...');

  try {
    const png256 = path.join(linuxIconsDir, '256x256.png');
    const icoPath = path.join(iconsDir, 'icon.ico');

    // 检查 ImageMagick 是否可用
    execSync('which convert || which magick', { stdio: 'ignore' });

    execSync(`convert "${png256}" "${icoPath}"`, { stdio: 'ignore' });
    console.log('  ✓ icon.ico');
    console.log('✅ ICO 图标生成完成\n');
  } catch (e) {
    console.log('⚠️  跳过 ICO 生成 (需要 ImageMagick)\n');
  }
}

/**
 * 生成 ICNS 图标 (macOS)
 * 需要使用 iconutil (macOS 原生工具)
 */
async function generateICNS() {
  console.log('📦 生成 ICNS 图标 (macOS)...');

  if (process.platform !== 'darwin') {
    console.log('⚠️  跳过 ICNS 生成 (仅支持 macOS)\n');
    return;
  }

  try {
    const iconsetDir = path.join(iconsDir, 'icon.iconset');

    // 清理并创建 iconset 目录
    if (fs.existsSync(iconsetDir)) {
      fs.rmSync(iconsetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(iconsetDir, { recursive: true });

    // 生成所需尺寸
    const sizes = [
      [16, 'icon_16x16.png'],
      [32, 'icon_16x16@2x.png'],
      [32, 'icon_32x32.png'],
      [64, 'icon_32x32@2x.png'],
      [128, 'icon_128x128.png'],
      [256, 'icon_128x128@2x.png'],
      [256, 'icon_256x256.png'],
      [512, 'icon_256x256@2x.png'],
      [512, 'icon_512x512.png'],
      [1024, 'icon_512x512@2x.png'],
    ];

    for (const [size, filename] of sizes) {
      const outputPath = path.join(iconsetDir, filename);
      await sharp(svgSource)
        .resize(size, size, { fit: 'cover' })
        .png()
        .toFile(outputPath);
    }

    // 使用 iconutil 生成 ICNS
    const icnsPath = path.join(iconsDir, 'icon.icns');
    if (fs.existsSync(icnsPath)) {
      fs.unlinkSync(icnsPath);
    }

    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, {
      stdio: 'ignore'
    });

    // 清理临时 iconset
    fs.rmSync(iconsetDir, { recursive: true, force: true });

    console.log('  ✓ icon.icns');
    console.log('✅ ICNS 图标生成完成\n');
  } catch (e) {
    console.log('⚠️  ICNS 生成失败:', e.message, '\n');
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    await generatePNG();
    generateICO();
    await generateICNS();

    console.log('🎉 所有图标生成完成！');
    console.log('\n📁 输出位置:');
    console.log(`   SVG: ${iconsDir}/icon.svg`);
    console.log(`   ICO: ${iconsDir}/icon.ico`);
    console.log(`   ICNS: ${iconsDir}/icon.icns`);
    console.log(`   PNG: ${linuxIconsDir}/\n`);

  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
