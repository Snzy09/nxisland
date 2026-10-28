package com.nxisland.android

import org.junit.Assert.assertEquals
import org.junit.Test

class AttributionTest {
    @Test fun nameAndRepoMatchPermission() {
        assertEquals("NxIsland for Android", Attribution.APP_NAME)
        assertEquals("https://github.com/Louis-CFM/nxisland", Attribution.REPO_URL)
    }
}
