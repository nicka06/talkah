package com.talkah.app_for_talking
import io.flutter.embedding.android.FlutterFragmentActivity
import android.os.Bundle

class MainActivity : FlutterFragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Apply Material Components theme before super.onCreate
        setTheme(com.google.android.material.R.style.Theme_MaterialComponents_Light_NoActionBar)
        super.onCreate(savedInstanceState)
    }
}
