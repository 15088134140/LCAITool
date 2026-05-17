#!/usr/bin/env python3
"""
使用豆包 Seedream 4.5 API 生成专业配图
"""
import requests
import base64
import os
from pathlib import Path

# 配置说明：
# 1. 登录火山引擎控制台 https://console.volcengine.com/ark/
# 2. 创建 API Key（API_KEY）
# 3. 模型名称: doubao-seedream-4-5-251128
# 4. 可选: 创建推理接入点，格式为 "ep-xxxxxx/doubao-seedream-4-5-251128"
API_KEY = "c07fab10-f644-4699-bff4-66ed8830b8af"
API_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
MODEL = "doubao-seedream-4-5-251128"  # 豆包 Seedream 4.5 官方模型名

# 输出目录
OUTPUT_DIR = Path("/Users/mark/Desktop/LCAITool/frontend/images")

def generate_image(prompt, filename, size="1920x1920"):
    """生成图片并保存到文件"""
    # 确保输出目录存在
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "size": size,
        "n": 1,
        "response_format": "b64_json"
    }

    try:
        print(f"正在生成: {filename}")
        print(f"Prompt: {prompt[:100]}...")

        response = requests.post(API_ENDPOINT, headers=headers, json=payload, timeout=120)

        # 打印详细错误信息
        if response.status_code != 200:
            print(f"✗ HTTP {response.status_code}: {response.text}")
            return False

        result = response.json()

        # 保存图片
        if "data" in result and len(result["data"]) > 0:
            image_data = base64.b64decode(result["data"][0]["b64_json"])
            output_path = OUTPUT_DIR / filename
            with open(output_path, "wb") as f:
                f.write(image_data)
            print(f"✓ 已保存: {output_path}")
            return True
        else:
            print(f"✗ 生成失败: {result}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"✗ 请求失败: {str(e)}")
        return False
    except Exception as e:
        print(f"✗ 未知错误: {str(e)}")
        return False

def check_config():
    """检查配置是否正确"""
    print("=" * 60)
    print("配置检查:")
    print(f"  API Endpoint: {API_ENDPOINT}")
    print(f"  Model: {MODEL}")
    print(f"  API Key: {API_KEY[:10]}...{API_KEY[-4:]}")
    print(f"  Output Dir: {OUTPUT_DIR}")
    print("=" * 60)

    # 测试API连接
    print("\n正在测试API连接...")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    # 使用简单的prompt测试
    payload = {
        "model": MODEL,
        "prompt": "test",
        "size": "1024x1024",
        "n": 1,
        "response_format": "b64_json"
    }

    try:
        response = requests.post(API_ENDPOINT, headers=headers, json=payload, timeout=30)
        if response.status_code == 200:
            print("✓ API连接成功!")
            return True
        elif response.status_code == 401:
            print("✗ API认证失败 (401)")
            print("  请检查:")
            print("  1. API Key 是否正确")
            print("  2. 是否已在火山引擎方舟控制台开通 Seedream 4.5 服务")
            print("  3. 账户是否有足够余额")
            return False
        elif response.status_code == 400:
            print(f"! 请求参数错误: {response.text}")
            # 可能只是prompt问题，继续
            return True
        else:
            print(f"! HTTP {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"✗ 连接测试失败: {e}")
        return False

def main():
    # 检查配置
    if not check_config():
        print("\n配置检查失败，请修正后重试")
        return

    # 定义需要生成的配图列表
    images_to_generate = [
        {
            "prompt": "Professional AI illustration, futuristic digital art, blue and green gradient, minimalist design, hero banner image, AI tool platform, clean modern UI style",
            "filename": "hero-banner.png",
            "size": "2560x1440"
        },
        {
            "prompt": "Children's book illustration icon, cute cartoon style, colorful storybook with pictures, dreamy fantasy art, friendly characters, professional app icon style",
            "filename": "tool-illustration.png"
        },
        {
            "prompt": "E-commerce product display icon, shopping cart with products, modern gradient blue and orange, professional UI icon, isometric style",
            "filename": "tool-ecommerce.png"
        },
        {
            "prompt": "Content creation icon, pen and paper with sparkles, creative writing, modern gradient design, green and teal colors, professional UI",
            "filename": "tool-content.png"
        },
        {
            "prompt": "Video production icon, film reel and play button, cinematic style, purple and blue gradient, professional UI design, movie clapper",
            "filename": "tool-video.png"
        },
        {
            "prompt": "Professional voice recording icon, microphone with sound waves, warm orange gradient, podcast style",
            "filename": "tool-voice.png"
        },
        {
            "prompt": "Education and learning icon, graduation cap and book, blue academic style, clean modern design",
            "filename": "tool-education.png"
        },
        {
            "prompt": "Office productivity icon, documents and charts, professional business style, blue gradient",
            "filename": "tool-office.png"
        },
        {
            "prompt": "User account profile icon, minimalist avatar, person silhouette, clean modern design",
            "filename": "icon-user.png"
        },
        {
            "prompt": "Security and safety shield icon, blue and green gradient, protection concept",
            "filename": "icon-security.png"
        },
        {
            "prompt": "Download and save file icon, arrow down to folder, blue gradient, professional UI design",
            "filename": "icon-download.png"
        },
        {
            "prompt": "Success and achievement icon, trophy with sparkles, celebration style, green and gold gradient",
            "filename": "icon-success.png"
        },
        {
            "prompt": "Team collaboration icon, people working together, isometric style, blue and green",
            "filename": "icon-team.png"
        },
        {
            "prompt": "Pricing and payment icon, credit card with coins, fintech style, green gradient",
            "filename": "icon-pricing.png"
        },
        {
            "prompt": "API integration icon, connecting puzzle pieces with code, tech style, blue purple gradient",
            "filename": "icon-api.png"
        },
        {
            "prompt": "Customization and settings icon, gears and sliders, tech style, grey and blue",
            "filename": "icon-customize.png"
        },
        {
            "prompt": "AI brain icon, artificial intelligence concept, neural network visualization, futuristic blue and purple gradient",
            "filename": "icon-ai.png"
        },
        {
            "prompt": "Image gallery icon, multiple photos in grid, photography app style, colorful gradient",
            "filename": "icon-gallery.png"
        },
        {
            "prompt": "Enterprise company building icon, modern skyscraper, business corporate style, isometric design",
            "filename": "icon-enterprise.png"
        }
    ]

    print(f"开始生成 {len(images_to_generate)} 张图片...")
    print("=" * 60)

    success_count = 0
    for img in images_to_generate:
        if generate_image(img["prompt"], img["filename"], img.get("size", "1920x1920")):
            success_count += 1
        print()

    print("=" * 60)
    print(f"完成! 成功生成 {success_count}/{len(images_to_generate)} 张图片")

if __name__ == "__main__":
    main()
