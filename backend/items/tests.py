from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Item

User = get_user_model()


class ItemApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="bob", password="Str0ng-Pass-123")
        self.other = User.objects.create_user(username="eve", password="Str0ng-Pass-123")
        self.client.force_authenticate(self.user)

    def test_create_and_list_own_items(self):
        resp = self.client.post(reverse("item-list"), {"name": "buy milk"}, format="json")
        self.assertEqual(resp.status_code, 201, resp.content)

        Item.objects.create(owner=self.other, name="not mine")

        resp = self.client.get(reverse("item-list"))
        self.assertEqual(resp.status_code, 200)
        names = [row["name"] for row in resp.data["results"]]
        self.assertEqual(names, ["buy milk"])

    def test_cannot_access_others_item(self):
        other_item = Item.objects.create(owner=self.other, name="secret")
        resp = self.client.get(reverse("item-detail", args=[other_item.id]))
        self.assertEqual(resp.status_code, 404)

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        resp = self.client.get(reverse("item-list"))
        self.assertEqual(resp.status_code, 401)

    def test_complete_is_idempotent(self):
        item = Item.objects.create(owner=self.user, name="task")
        url = reverse("item-complete", args=[item.id])

        first = self.client.post(url)
        self.assertEqual(first.status_code, 200, first.content)
        self.assertTrue(first.data["is_done"])

        # 重複呼叫不應出錯、結果一致（idempotent）
        second = self.client.post(url)
        self.assertEqual(second.status_code, 200, second.content)
        self.assertTrue(second.data["is_done"])

        item.refresh_from_db()
        self.assertTrue(item.is_done)

    def test_cannot_complete_others_item(self):
        other_item = Item.objects.create(owner=self.other, name="secret")
        resp = self.client.post(reverse("item-complete", args=[other_item.id]))
        self.assertEqual(resp.status_code, 404)

    def test_filter_by_is_done(self):
        Item.objects.create(owner=self.user, name="done one", is_done=True)
        Item.objects.create(owner=self.user, name="pending one", is_done=False)

        resp = self.client.get(reverse("item-list"), {"is_done": "true"})
        self.assertEqual(resp.status_code, 200)
        names = [row["name"] for row in resp.data["results"]]
        self.assertEqual(names, ["done one"])

    def test_search_by_name(self):
        Item.objects.create(owner=self.user, name="buy milk")
        Item.objects.create(owner=self.user, name="walk dog")

        resp = self.client.get(reverse("item-list"), {"search": "milk"})
        self.assertEqual(resp.status_code, 200)
        names = [row["name"] for row in resp.data["results"]]
        self.assertEqual(names, ["buy milk"])
