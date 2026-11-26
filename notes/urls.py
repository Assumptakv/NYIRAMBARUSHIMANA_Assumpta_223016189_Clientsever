
from django.urls import path
from . import views

urlpatterns = [
    path('notes/', views.note_list, name='note-list'),
    path('notes/<int:note_id>/', views.note_detail, name='note-detail'),
    path('tags/', views.tag_list, name='tag-list'),
    path('analytics/tags/', views.tag_analytics, name='tag-analytics'),
]
