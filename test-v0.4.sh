#!/bin/bash
set -e

API="http://9.135.1.140:3310/api/v1"
TOKEN="your-token-here"  # Replace with actual token

echo "=== Testing v0.4 Features ==="

# 1. Register new user (will get short ID)
echo -e "\n1. Register user..."
USER_RESP=$(curl -s -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }')
echo "$USER_RESP" | jq '{id: .data.user.id, name: .data.user.name}'
TOKEN=$(echo "$USER_RESP" | jq -r '.data.token')

# 2. Create project (will get short ID)
echo -e "\n2. Create project..."
PROJECT_RESP=$(curl -s -X POST "$API/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-proj",
    "name": "Test Project",
    "description": "Testing short IDs"
  }')
echo "$PROJECT_RESP" | jq '{id: .data.project.id, slug: .data.project.slug}'

# 3. Create idea with tags (will get short ID + auto cover)
echo -e "\n3. Create idea..."
IDEA_RESP=$(curl -s -X POST "$API/ideas" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Idea with Cover",
    "content": "## Description\n\nThis idea should have a cover image!",
    "summary": "Testing cover image generation",
    "tags": ["feature", "design"]
  }')
echo "$IDEA_RESP" | jq '{id: .data.idea.id, cover_url: .data.idea.cover_url}'

IDEA_ID=$(echo "$IDEA_RESP" | jq -r '.data.idea.id')

# 4. Add comment (will get short ID)
echo -e "\n4. Add comment..."
COMMENT_RESP=$(curl -s -X POST "$API/ideas/$IDEA_ID/comments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Great idea!"}')
echo "$COMMENT_RESP" | jq '{id: .data.comment.id, content: .data.comment.content}'

# 5. Verify ID lengths
echo -e "\n=== ID Length Verification ==="
USER_ID=$(echo "$USER_RESP" | jq -r '.data.user.id')
PROJECT_ID=$(echo "$PROJECT_RESP" | jq -r '.data.project.id')
COMMENT_ID=$(echo "$COMMENT_RESP" | jq -r '.data.comment.id')

echo "User ID: $USER_ID (length: ${#USER_ID})"
echo "Project ID: $PROJECT_ID (length: ${#PROJECT_ID})"
echo "Idea ID: $IDEA_ID (length: ${#IDEA_ID})"
echo "Comment ID: $COMMENT_ID (length: ${#COMMENT_ID})"

echo -e "\n✅ All IDs should be 8 characters!"
echo -e "\n📸 Visit idea page to see cover: http://9.135.1.140:3311/ideas/$IDEA_ID"
