import pytest
import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

class TestAddfavs():
    def setup_method(self, method):
        self.driver = webdriver.Firefox()
        self.vars = {}
  
    def teardown_method(self, method):
        self.driver.quit()
  
    def test_addfavs(self):
        self.driver.get("http://localhost:8889/lab/")
        self.driver.implicitly_wait(30)
        
        # src_file = self.driver.find_element(By.XPATH, "/html/body/div/div[3]/div[2]/div[1]/div[2]/div[4]/ul/li[2]")
        # actions = ActionChains(self.driver)
        # actions.double_click(src_file).perform() #works
        tests = self.driver.find_element(By.XPATH, "//span[contains(text(),'tests')]")
        actions = ActionChains(self.driver)
        self.driver.implicitly_wait(30)
        actions.double_click(tests).perform()
        self.driver.implicitly_wait(15)

        test_folder = self.driver.find_element(By.XPATH, "//span[contains(text(),'test_folder')]")
        actions = ActionChains(self.driver)
        actions.double_click(test_folder).perform()
        self.driver.implicitly_wait(15)
        
        test_folder_fav = self.driver.find_element(By.XPATH,"/html/body/div/div[3]/div[2]/div[1]/div[6]/div[2]/div/div/span") 
        actions = ActionChains(self.driver)
        actions.click(test_folder_fav).perform()

        # added_fav_text = self.driver.find_element(By.XPATH, "/html/body/div/div[3]/div[2]/div[1]/div[5]/div[2]/div/div[2]/div/span[2]")
        added_fav_text = self.driver.find_element(By.XPATH, "/html/body/div/div[3]/div[2]/div[1]/div[6]/div[2]/div/div[2]/div")
        assert added_fav_text.text == "test_folder"

        added_fav_elem = self.driver.find_element(By.XPATH, "/html/body/div/div[3]/div[2]/div[1]/div[6]/div[2]/div/div[2]/div")
        actions = ActionChains(self.driver)
        actions.context_click(added_fav_elem).perform()
        actions.send_keys(Keys.ARROW_DOWN).perform()
        actions.send_keys(Keys.ENTER).perform()

        

    # def test_removefavs(self):
    #     added_fav_elem = self.driver.find_element(By.XPATH, "/html/body/div/div[3]/div[2]/div[1]/div[2]/div[2]/div/div[1]/div[3]")
    #     actions = ActionChains(self.driver)
    #     actions.context_click(added_fav_elem).perform()
    #     actions.send_keys(Keys.ARROW_DOWN).perform()
    #     actions.send_keys(Keys.ENTER).perform()

if __name__ == '__main__':
  setup_method()
  test_addfavs()
#   test_removefavs()
  teardown_method()